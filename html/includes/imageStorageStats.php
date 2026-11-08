<?php

/**
 * Measures image storage for the local days-to-keep setting.
 *
 * The figures use allocated disk bytes, matching the space reported by the
 * filesystem. Only dated day folders are included in retention estimates;
 * other files under the images directory remain in its total size.
 */
final class ImageStorageStats
{
    private const SAMPLE_DAYS = 14;

    /**
     * Collect disk and day-folder sizes for a particular images directory.
     *
     * The capture script may still write to today's folder or, during the
     * morning, yesterday's night folder. Those folders are excluded from the
     * daily average but remain in the total and retention calculations.
     *
     * @param string $root Images directory, including any user override.
     * @param DateTimeImmutable $now Current time in the camera's time zone.
     * @return array<string, mixed> Byte counts and newest-first day sizes.
     * @throws RuntimeException When the directory or its disk cannot be read.
     */
    public static function collect(string $root, DateTimeImmutable $now): array
    {
        $root = realpath($root);
        if ($root === false || !is_dir($root)) {
            throw new RuntimeException('The images directory is unavailable.');
        }

        $free = @disk_free_space($root);
        $total = @disk_total_space($root);
        if ($free === false || $total === false) {
            throw new RuntimeException('Unable to read free space on the images disk.');
        }

        $names = @scandir($root);
        if ($names === false) {
            throw new RuntimeException('Unable to list image day folders.');
        }
        $paths = [];
        foreach ($names as $name) {
            if (!preg_match('/^20\d{6}$/', $name)) {
                continue;
            }
            $year = (int)substr($name, 0, 4);
            $month = (int)substr($name, 4, 2);
            $day = (int)substr($name, 6, 2);
            if (!checkdate($month, $day, $year) || !is_dir($root . '/' . $name)
                || is_link($root . '/' . $name)) {
                continue;
            }
            $paths[$name] = $root . '/' . $name;
        }
        krsort($paths, SORT_STRING);

        $imagesBytes = self::diskUsage([$root])[0];
        $daySizes = [];
        foreach (array_chunk($paths, 100, true) as $chunk) {
            $sizes = self::diskUsage(array_values($chunk));
            foreach (array_keys($chunk) as $index => $name) {
                $daySizes[$name] = $sizes[$index];
            }
        }

        $earliestActiveDay = $now->modify('-12 hours')->format('Ymd');
        $samples = [];
        foreach ($daySizes as $name => $bytes) {
            if ($name < $earliestActiveDay && count($samples) < self::SAMPLE_DAYS) {
                $samples[] = $bytes;
            }
        }
        $datedBytes = array_sum($daySizes);

        return [
            'images_bytes' => $imagesBytes,
            'free_bytes' => (int)$free,
            'disk_total_bytes' => (int)$total,
            'dated_bytes' => $datedBytes,
            'other_bytes' => max(0, $imagesBytes - $datedBytes),
            'days' => array_values($daySizes),
            'day_count' => count($daySizes),
            'sample_count' => count($samples),
            'average_day_bytes' => $samples ? (int)round(array_sum($samples) / count($samples)) : null,
        ];
    }

    /**
     * Ask GNU du for allocated bytes without following symbolic links.
     *
     * @param array<int, string> $paths Absolute paths to measure.
     * @return array<int, int> Sizes in the same order as the paths.
     * @throws RuntimeException When any path cannot be measured.
     */
    private static function diskUsage(array $paths): array
    {
        if (!$paths) {
            return [];
        }
        $command = 'du -s -B1 -- ' . implode(' ', array_map('escapeshellarg', $paths)) . ' 2>/dev/null';
        $lines = [];
        $status = 0;
        exec($command, $lines, $status);
        if ($status !== 0 || count($lines) !== count($paths)) {
            throw new RuntimeException('Unable to measure image storage.');
        }
        $sizes = [];
        foreach ($lines as $line) {
            if (!preg_match('/^(\d+)\s/', $line, $matches)) {
                throw new RuntimeException('Unable to read image storage measurements.');
            }
            $sizes[] = (int)$matches[1];
        }
        return $sizes;
    }
}
