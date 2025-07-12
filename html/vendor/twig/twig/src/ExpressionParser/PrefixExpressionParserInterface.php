<?php

/*
 * This file is part of Twig.
 *
 * (c) Fabien Potencier
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace Twig\ExpressionParser;

use Twig\Node\Expression\AbstractExpression;
use Twig\Parser;
use Twig\Token;

interface PrefixExpressionParserInterface extends ExpressionParserInterface
{
    public function parse(Parser $parser, Token $token): AbstractExpression;
}
