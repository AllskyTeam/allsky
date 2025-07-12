<?php
// src/Twig/MenuExtension.php

use Twig\Extension\AbstractExtension;
use Twig\TwigFunction;

class MenuExtension extends AbstractExtension
{
    public function getFunctions(): array
    {
        return [
            new TwigFunction('render_menu', [$this, 'renderMenu'], ['is_safe' => ['html']])
        ];
    }

    public function renderMenu(array $pages): string
    {
        $html = '<nav class="nav flex-column mt-2">';
        foreach ($pages as $key => $info) {
            if ($info['inmenu']) {
                $title = htmlspecialchars($info['title']);
                $icon = htmlspecialchars($info['icon']);
                $html .= sprintf(
                    '<a id="%s" class="nav-link text-muted" href="index.php?page=%s"><i class="%s fa-fw"></i> <span>%s</span></a>',
                    $key,
                    $key,
                    $icon,
                    $title
                );
            }
        }
        $html .= '</nav>';
        return $html;
    }
}