<?php
declare(strict_types=1);

include_once('functions.php');
initialize_variables();
include_once('authenticate.php');
include_once('utilbase.php');

/**
 * IMAGESUTIL
 *
 * AJAX endpoint used by the page that lists a day's images (includes/images.php).
 */
class IMAGESUTIL extends UTILBASE
{
    protected function getRoutes(): array
    {
        return [
            'DeleteImage' => ['post'],
        ];
    }

    /**
     * Delete one or more images in a day's directory, along with their
     * thumbnails and their rows in the images table of the database.
     *
     * POST fields:
     *   day     The directory in ALLSKY_IMAGES.
     *   images  A JSON array of image names.
     *
     * Every name is checked before anything is deleted.
     * The response says what happened to each image:
     *   deleted  Names whose image is gone.
     *   failed   Names whose image is still there.
     *   dbRows   Number of database rows removed; see deleteDatabaseRows().
     *   message  Any error text from "rm".
     */
    public function postDeleteImage(): void
    {
        global $re_image_name, $re_test_image_name, $test_directory;

        $day = $_POST['day'] ?? '';
        if (!is_valid_directory($day)) {
            $this->send400('Invalid day.');
        }
        $base = realpath(ALLSKY_IMAGES);
        $dir = realpath(ALLSKY_IMAGES . "/$day");
        if ($base === false || $dir === false || !is_dir($dir) ||
            strpos($dir, rtrim($base, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR) !== 0) {
            $this->send400('Invalid day.');
        }

        // The names are sent as JSON in one field so a long list is not limited by max_input_vars.
        $images = $_POST['images'] ?? null;
        $images = is_string($images) ? json_decode($images, true) : null;
        if (!is_array($images) || count($images) === 0) {
            $this->send400('No images specified.');
        }

        $re = $this->startsWith($day, $test_directory) ? $re_test_image_name : $re_image_name;
        $paths = [];
        foreach ($images as $image) {
            // The regular expressions allow control characters, which "rm" could not be given.
            if (!is_string($image) || $image !== basename($image) || preg_match($re, $image) !== 1 ||
                preg_match('/[\x00-\x1f\x7f]/', $image) === 1 || strlen($image) > 255) {
                $this->send400('Invalid image name.');
            }
            $paths[] = "$dir/$image";
            $paths[] = "$dir/thumbnails/$image";
        }

        // The images belong to the Allsky owner so, like deleting a whole day, "sudo rm" is needed.
        // Chunks keep each command well under the limit on the length of its arguments.
        $errors = [];
        foreach (array_chunk($paths, 500) as $chunk) {
            $result = $this->runProcess(array_merge(['/usr/bin/sudo', '/bin/rm', '-f', '--'], $chunk));
            if ($result['error']) {
                $errors[] = trim((string)$result['message']);
            }
        }

        // Report what is actually on disk now, whatever "rm" said.
        clearstatcache();
        $deleted = [];
        $failed = [];
        foreach (array_unique($images) as $image) {
            if (file_exists("$dir/$image")) {
                $failed[] = $image;
            } else {
                $deleted[] = $image;
            }
        }

        $response = [
            'deleted' => $deleted,
            'failed' => $failed,
            'dbRows' => $this->deleteDatabaseRows($day, $deleted),
        ];
        if (count($errors) > 0) {
            $response['message'] = implode("\n", array_unique($errors));
        }
        $this->sendResponse($response);
    }

    /**
     * Connect to the Allsky database.
     * Like makePdo() in chartutil.php, except for where the MySQL database name comes from.
     *
     * @return PDO|null  null if the database is disabled or there is no database.
     */
    private function makePdo(): ?PDO
    {
        global $settings_array;

        // getDatabaseConfig() does not look at the "Enable Database" setting.
        if (!toBool(getVariableOrDefault($settings_array, 'enabledatabase', "true"))) {
            return null;
        }

        $secretData = getDatabaseConfig();
        $databaseType = $secretData['databasetype'] ?? '';
        $options = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION];

        if ($databaseType === 'mysql') {
            // The name of the database is an Allsky setting, not a secret.
            // get_database_config() in allsky_shared.py reads it the same way.
            $dsn = sprintf(
                'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
                $secretData['databasehost'],
                (int)($secretData['databaseport'] ?? 3306),
                getVariableOrDefault($settings_array, 'databasedatabase', '')
            );
            return new PDO($dsn, $secretData['databaseuser'], $secretData['databasepassword'], $options);
        }

        if ($databaseType === 'sqlite' && file_exists(ALLSKY_DATABASE)) {
            // Images are added to the database while Allsky is running, so wait if it is locked.
            $options[PDO::ATTR_TIMEOUT] = 5;
            return new PDO('sqlite:' . ALLSKY_DATABASE, null, null, $options);
        }

        return null;
    }

    /**
     * Remove the rows for the given images from the images table so that
     * nothing that reads the list of images from the database still sees them.
     *
     * @return int|null  The number of rows removed,
     *                   null if the database is disabled or there is no database or
     *                   no images table (none of which is an error),
     *                   -1 if the database could not be updated.
     */
    private function deleteDatabaseRows(string $day, array $images): ?int
    {
        $pdo = null;
        try {
            $pdo = $this->makePdo();
            if ($pdo === null) {
                return null;
            }

            if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite') {
                $sql = "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?";
            } else {
                $sql = 'SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?';
            }
            $stmt = $pdo->prepare($sql);
            $stmt->execute([ALLSKY_IMAGES_TABLE]);
            if ($stmt->fetchColumn() === false) {
                return null;
            }

            // AS_CAMERAIMAGE holds the image's file name without a directory.
            $stmt = $pdo->prepare(
                'DELETE FROM ' . ALLSKY_IMAGES_TABLE . ' WHERE AS_DATE_NAME = ? AND AS_CAMERAIMAGE = ?'
            );
            $rows = 0;
            $pdo->beginTransaction();
            foreach ($images as $image) {
                $stmt->execute([$day, $image]);
                $rows += $stmt->rowCount();
            }
            $pdo->commit();
            return $rows;
        } catch (\Throwable $e) {
            if ($pdo !== null && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log('IMAGESUTIL: unable to delete rows from the database: ' . $e->getMessage());
            return -1;
        }
    }
}

(new IMAGESUTIL())->run();
