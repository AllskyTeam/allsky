<?php

/*
 * This file is part of Twig.
 *
 * (c) Fabien Potencier
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace Twig\Node\Expression;

use Twig\Compiler;
use Twig\Node\Expression\Unary\SpreadUnary;
use Twig\Node\Expression\Unary\StringCastUnary;
use Twig\Node\Expression\Variable\ContextVariable;

class ArrayExpression extends AbstractExpression implements SupportDefinedTestInterface, ReturnArrayInterface
{
    use SupportDefinedTestTrait;

    private $index;

    public function __construct(array $elements, int $lineno)
    {
        parent::__construct($elements, [], $lineno);

        $this->index = -1;
        foreach ($this->getKeyValuePairs() as $pair) {
            if ($pair['key'] instanceof ConstantExpression && ctype_digit((string) $pair['key']->getAttribute('value')) && $pair['key']->getAttribute('value') > $this->index) {
                $this->index = $pair['key']->getAttribute('value');
            }
        }
    }

    public function getKeyValuePairs(): array
    {
        $pairs = [];
        foreach (array_chunk($this->nodes, 2) as $pair) {
            $pairs[] = [
                'key' => $pair[0],
                'value' => $pair[1],
            ];
        }

        return $pairs;
    }

    public function hasElement(AbstractExpression $key): bool
    {
        foreach ($this->getKeyValuePairs() as $pair) {
            // we compare the string representation of the keys
            // to avoid comparing the line numbers which are not relevant here.
            if ((string) $key === (string) $pair['key']) {
                return true;
            }
        }

        return false;
    }

    public function addElement(AbstractExpression $value, ?AbstractExpression $key = null): void
    {
        if (null === $key) {
            $key = new ConstantExpression(++$this->index, $value->getTemplateLine());
        }

        array_push($this->nodes, $key, $value);
    }

    public function compile(Compiler $compiler): void
    {
        if ($this->definedTest) {
            $compiler->repr(true);

            return;
        }

        $compiler->raw('[');
        $isSequence = true;
        foreach ($this->getKeyValuePairs() as $i => $pair) {
            if (0 !== $i) {
                $compiler->raw(', ');
            }

            $key = null;
            if ($pair['key'] instanceof ContextVariable) {
                $pair['key'] = new StringCastUnary($pair['key'], $pair['key']->getTemplateLine());
            } elseif ($pair['key'] instanceof TempNameExpression) {
                $key = $pair['key']->getAttribute('name');
                $pair['key'] = new ConstantExpression($key, $pair['key']->getTemplateLine());
            } elseif ($pair['key'] instanceof ConstantExpression) {
                $key = $pair['key']->getAttribute('value');
            }

            if ($key !== $i) {
                $isSequence = false;
            }

            if (!$isSequence && !$pair['value'] instanceof SpreadUnary) {
                $compiler
                    ->subcompile($pair['key'])
                    ->raw(' => ')
                ;
            }

            $compiler->subcompile($pair['value']);
        }
        $compiler->raw(']');
    }
}
