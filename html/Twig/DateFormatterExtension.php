<?php
use Twig\Extension\AbstractExtension;
use Twig\TwigFilter;
use Locale;
use IntlDateFormatter;

class DateFormatterExtension extends AbstractExtension
{
    public function getFilters(): array
    {
        return [
            new TwigFilter('format_date', [$this, 'formatDate']),
        ];
    }

    public function formatDate(string $yyyymmdd, ?string $locale = null): string
    {
        if (!preg_match('/^\d{8}$/', $yyyymmdd)) {
            return $yyyymmdd;
        }

        $year  = substr($yyyymmdd, 0, 4);
        $month = substr($yyyymmdd, 4, 2);
        $day   = substr($yyyymmdd, 6, 2);

        $date = new \DateTime("{$year}-{$month}-{$day}");

        // Auto-detect locale if not passed
        if (!$locale) {
            $locale = $this->detectLocale() ?? 'en_GB';
        }

        $fmt = new IntlDateFormatter(
            $locale,
            IntlDateFormatter::LONG,
            IntlDateFormatter::NONE
        );

        return $fmt->format($date);
    }

    private function detectLocale(): ?string
    {
        // Try PHP locale first
        if (function_exists('locale_get_default')) {
            return locale_get_default();
        }

        // Fallback to browser language
        if (!empty($_SERVER['HTTP_ACCEPT_LANGUAGE'])) {
            return Locale::acceptFromHttp($_SERVER['HTTP_ACCEPT_LANGUAGE']);
        }

        return null;
    }
}
?>