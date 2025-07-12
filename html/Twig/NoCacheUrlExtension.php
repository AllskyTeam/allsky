<?php
use Twig\Extension\AbstractExtension;
use Twig\TwigFunction;

class NoCacheUrlExtension extends AbstractExtension
{
    public function getFunctions(): array
    {
        return [
            new TwigFunction('nocache_url', [$this, 'generateNoCacheUrl']),
        ];
    }

    public function generateNoCacheUrl(string $url): string
    {
        $timestamp = time();

        if (strpos($url, '?') !== false) {
            return $url . '&ts=' . $timestamp;
        } else {
            return $url . '?ts=' . $timestamp;
        }
    }
}