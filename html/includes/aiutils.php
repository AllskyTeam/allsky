<?php
declare(strict_types=1);

include_once('functions.php');
initialize_variables();
include_once('authenticate.php');
include_once('utilbase.php');

class AIUTIL extends UTILBASE
{
    private string $baseDir;
    private string $foldersDir;
    private string $datasetFile;
    private string $modelFile;
    private string $tfStatusFile;
    private string $tfModelFile;
    private string $tfLogFile;
    private string $tfPython;

    protected bool $requireAjax = true;

    protected function getRoutes(): array
    {
        return [
            'Assignments' => ['post'],
            'Dataset'     => ['get'],
            'Folders'     => ['delete', 'get', 'post'],
            'Images'      => ['get'],
            'Model'       => ['get', 'post'],
            'TensorFlowStatus' => ['get'],
            'TensorFlowTrain'  => ['post'],
        ];
    }

    public function __construct()
    {
        $this->baseDir = ALLSKY_MYFILES_DIR . '/ai-training';
        $this->foldersDir = $this->baseDir . '/folders';
        $this->datasetFile = $this->baseDir . '/dataset.json';
        $this->modelFile = $this->baseDir . '/model.json';
        $this->tfStatusFile = $this->baseDir . '/tensorflow-status.json';
        $this->tfModelFile = $this->baseDir . '/tensorflow-model.keras';
        $this->tfLogFile = $this->baseDir . '/tensorflow-train.log';
        $this->tfPython = ALLSKY_HOME . '/venv-tf/bin/python';
        $this->ensureStorage();
    }

    public function getDataset(): void
    {
        $dataset = $this->loadDataset();
        $dataset['folders'] = array_values($dataset['folders']);
        usort($dataset['folders'], static function ($a, $b) {
            return strcmp($a['name'], $b['name']);
        });
        $dataset['modelExists'] = file_exists($this->modelFile);
        $dataset['tensorflow'] = $this->readTensorFlowStatus();
        $this->sendResponse($dataset);
    }

    public function getFolders(): void
    {
        $dataset = $this->loadDataset();
        $folders = array_values($dataset['folders']);
        usort($folders, static function ($a, $b) {
            return strcmp($a['name'], $b['name']);
        });
        $this->sendResponse(['folders' => $folders]);
    }

    public function postFolders(): void
    {
        $name = trim((string)($_POST['name'] ?? ''));
        if ($name === '') {
            $this->send400('Folder name is required.');
        }

        $dataset = $this->loadDataset();
        $folder = $this->upsertFolder($dataset, $name);
        $this->saveDataset($dataset);
        $this->sendResponse(['folder' => $folder, 'folders' => array_values($dataset['folders'])]);
    }

    public function deleteFolders(): void
    {
        parse_str((string)file_get_contents('php://input'), $payload);
        $slug = trim((string)($payload['slug'] ?? ($_REQUEST['slug'] ?? '')));
        if ($slug === '') {
            $this->send400('Folder slug is required.');
        }

        $dataset = $this->loadDataset();
        if (!isset($dataset['folders'][$slug])) {
            $this->send404('Folder not found.');
        }

        unset($dataset['folders'][$slug]);
        $this->removeTree($this->folderPath($slug));
        $this->saveDataset($dataset);
        $this->sendResponse(['folders' => array_values($dataset['folders'])]);
    }

    public function getImages(): void
    {
        $days = getValidImageDirectories();
        rsort($days);
        $dayStats = [];

        foreach ($days as $imageDay) {
            $dayStats[] = [
                'day' => $imageDay,
                'count' => count(getValidImageNames(ALLSKY_IMAGES . '/' . $imageDay, false)),
            ];
        }

        $day = trim((string)($_GET['day'] ?? ''));
        if ($day === '' || !in_array($day, $days, true)) {
            $day = $days[0] ?? '';
        }

        $limit = (int)($_GET['limit'] ?? 120);
        if ($limit < 1) {
            $limit = 120;
        }
        if ($limit > 500) {
            $limit = 500;
        }

        $images = [];
        if ($day !== '') {
            $imageNames = getValidImageNames(ALLSKY_IMAGES . '/' . $day, false);
            rsort($imageNames);
            $imageNames = array_slice($imageNames, 0, $limit);
            foreach ($imageNames as $imageName) {
                $relative = $day . '/' . $imageName;
                $images[] = [
                    'day' => $day,
                    'filename' => $imageName,
                    'path' => $relative,
                    'url' => '/images/' . $relative,
                    'thumbnail' => '/images/' . $day . '/thumbnails/' . $imageName,
                ];
            }
        }

        $this->sendResponse([
            'days' => $dayStats,
            'selectedDay' => $day,
            'images' => $images,
        ]);
    }

    public function postAssignments(): void
    {
        $folderName = trim((string)($_POST['folder'] ?? ''));
        $action = trim((string)($_POST['action'] ?? 'add'));
        $images = $_POST['images'] ?? [];
        if (!is_array($images)) {
            $images = [$images];
        }

        if ($folderName === '') {
            $this->send400('Folder is required.');
        }
        if ($action !== 'add' && $action !== 'remove') {
            $this->send400('Invalid assignment action.');
        }

        $dataset = $this->loadDataset();
        $folder = $this->upsertFolder($dataset, $folderName);
        $slug = $folder['slug'];
        $changed = 0;

        foreach ($images as $imagePath) {
            $relative = $this->normaliseImagePath((string)$imagePath);
            if ($relative === null) {
                continue;
            }

            $existing = $dataset['folders'][$slug]['images'];
            if ($action === 'add') {
                if (!in_array($relative, $existing, true)) {
                    $dataset['folders'][$slug]['images'][] = $relative;
                    $this->linkImageIntoFolder($slug, $relative);
                    $changed++;
                }
            } else {
                $index = array_search($relative, $existing, true);
                if ($index !== false) {
                    unset($dataset['folders'][$slug]['images'][$index]);
                    $dataset['folders'][$slug]['images'] = array_values($dataset['folders'][$slug]['images']);
                    $this->removeLinkedImage($slug, $relative);
                    $changed++;
                }
            }
        }

        $dataset['folders'][$slug]['count'] = count($dataset['folders'][$slug]['images']);
        $this->saveDataset($dataset);

        $this->sendResponse([
            'changed' => $changed,
            'folder' => $dataset['folders'][$slug],
            'folders' => array_values($dataset['folders']),
        ]);
    }

    public function getModel(): void
    {
        if (!file_exists($this->modelFile)) {
            $this->sendResponse(['model' => null]);
        }

        $raw = (string)@file_get_contents($this->modelFile);
        $decoded = json_decode($raw, true);
        $this->sendResponse(['model' => $decoded]);
    }

    public function postModel(): void
    {
        $model = $_POST['model'] ?? '';
        if (!is_string($model) || trim($model) === '') {
            $this->send400('Model payload is required.');
        }

        json_decode($model, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->send400('Model payload must be valid JSON.');
        }

        $result = @file_put_contents($this->modelFile, $model);
        if ($result === false) {
            $this->send500('Unable to save model.');
        }

        $this->sendResponse(['saved' => true]);
    }

    public function getTensorFlowStatus(): void
    {
        $this->sendResponse($this->readTensorFlowStatus());
    }

    public function postTensorFlowTrain(): void
    {
        $dataset = $this->loadDataset();
        $folders = array_values(array_filter($dataset['folders'], static function ($folder) {
            return count((array)($folder['images'] ?? [])) > 0;
        }));

        if (count($folders) < 2) {
            $this->send400('TensorFlow training needs at least two non-empty classes.');
        }

        $status = $this->readTensorFlowStatus();
        if (($status['state'] ?? '') === 'running') {
            $this->sendResponse([
                'started' => false,
                'message' => 'TensorFlow training is already running.',
                'status' => $status,
            ]);
        }

        $epochs = (int)($_POST['epochs'] ?? 5);
        if ($epochs < 1) {
            $epochs = 5;
        }
        if ($epochs > 30) {
            $epochs = 30;
        }

        $payload = [
            'state' => 'queued',
            'message' => 'TensorFlow training queued.',
            'updated' => gmdate(DATE_ATOM),
            'engine' => 'tensorflow',
            'progress' => 0,
            'epochs' => $epochs,
            'modelPath' => $this->tfModelFile,
            'logPath' => $this->tfLogFile,
            'pythonPath' => $this->tfPython,
        ];
        $this->writeJsonFile($this->tfStatusFile, $payload);

        if (!file_exists($this->tfPython)) {
            $this->writeJsonFile($this->tfStatusFile, [
                'state' => 'failed',
                'message' => 'TensorFlow venv not found. Create /home/pi/allsky/venv-tf first.',
                'updated' => gmdate(DATE_ATOM),
                'engine' => 'tensorflow',
                'progress' => 0,
                'modelPath' => $this->tfModelFile,
                'logPath' => $this->tfLogFile,
                'pythonPath' => $this->tfPython,
            ]);
            $this->send400('TensorFlow venv not found. Create /home/pi/allsky/venv-tf first.');
        }

        $argv = [
            $this->tfPython,
            ALLSKY_HOME . '/scripts/train_tensorflow_classifier.py',
            '--dataset-dir',
            $this->foldersDir,
            '--status-file',
            $this->tfStatusFile,
            '--model-file',
            $this->tfModelFile,
            '--log-file',
            $this->tfLogFile,
            '--epochs',
            (string)$epochs,
        ];

        $started = $this->startBackgroundProcess($argv, $this->tfLogFile);
        if (!$started) {
            $this->send500('Unable to start TensorFlow trainer.');
        }

        $this->sendResponse([
            'started' => true,
            'message' => 'TensorFlow training started.',
            'status' => $this->readTensorFlowStatus(),
        ]);
    }

    private function ensureStorage(): void
    {
        foreach ([$this->baseDir, $this->foldersDir] as $dir) {
            if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
                $this->send500('Unable to create AI storage.');
            }
        }

        if (!file_exists($this->datasetFile)) {
            $dataset = ['folders' => [], 'updated' => gmdate(DATE_ATOM)];
            @file_put_contents($this->datasetFile, json_encode($dataset, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        }

        if (!file_exists($this->tfStatusFile)) {
            $this->writeJsonFile($this->tfStatusFile, [
                'state' => 'idle',
                'message' => 'TensorFlow trainer has not been started.',
                'updated' => gmdate(DATE_ATOM),
                'engine' => 'tensorflow',
                'progress' => 0,
                'modelPath' => $this->tfModelFile,
                'logPath' => $this->tfLogFile,
                'pythonPath' => $this->tfPython,
            ]);
        }
    }

    private function loadDataset(): array
    {
        $raw = @file_get_contents($this->datasetFile);
        $dataset = json_decode((string)$raw, true);
        if (!is_array($dataset)) {
            $dataset = ['folders' => [], 'updated' => gmdate(DATE_ATOM)];
        }
        if (!isset($dataset['folders']) || !is_array($dataset['folders'])) {
            $dataset['folders'] = [];
        }

        foreach ($dataset['folders'] as $slug => &$folder) {
            $folder['slug'] = $slug;
            $folder['name'] = (string)($folder['name'] ?? $slug);
            $folder['images'] = array_values(array_filter((array)($folder['images'] ?? []), function ($imagePath) {
                return $this->normaliseImagePath((string)$imagePath) !== null;
            }));
            $folder['count'] = count($folder['images']);
        }
        unset($folder);

        return $dataset;
    }

    private function saveDataset(array $dataset): void
    {
        foreach ($dataset['folders'] as $slug => &$folder) {
            $folder['slug'] = $slug;
            $folder['images'] = array_values(array_unique($folder['images']));
            sort($folder['images']);
            $folder['count'] = count($folder['images']);
        }
        unset($folder);

        $dataset['updated'] = gmdate(DATE_ATOM);
        $json = json_encode($dataset, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        if ($json === false || @file_put_contents($this->datasetFile, $json) === false) {
            $this->send500('Unable to save dataset.');
        }
    }

    private function upsertFolder(array &$dataset, string $name): array
    {
        $slug = $this->slugify($name);
        if ($slug === '') {
            $this->send400('Folder name is invalid.');
        }

        if (!isset($dataset['folders'][$slug])) {
            $dataset['folders'][$slug] = [
                'name' => $name,
                'slug' => $slug,
                'images' => [],
                'count' => 0,
            ];
        } else {
            $dataset['folders'][$slug]['name'] = $name;
            $dataset['folders'][$slug]['slug'] = $slug;
        }

        $folderPath = $this->folderPath($slug);
        if (!is_dir($folderPath) && !@mkdir($folderPath, 0775, true) && !is_dir($folderPath)) {
            $this->send500('Unable to create dataset folder.');
        }

        return $dataset['folders'][$slug];
    }

    private function slugify(string $value): string
    {
        $slug = strtolower(trim($value));
        $slug = preg_replace('/[^a-z0-9_-]+/', '-', $slug);
        $slug = preg_replace('/-+/', '-', (string)$slug);
        return trim((string)$slug, '-');
    }

    private function normaliseImagePath(string $relative): ?string
    {
        $relative = ltrim(trim($relative), '/');
        $parts = explode('/', $relative, 2);
        if (count($parts) !== 2) {
            return null;
        }

        [$day, $filename] = $parts;
        if (!is_valid_directory($day)) {
            return null;
        }
        if (!preg_match('/^[A-Za-z0-9_.-]+\.(jpe?g|png)$/i', $filename)) {
            return null;
        }

        $fullPath = ALLSKY_IMAGES . '/' . $day . '/' . $filename;
        $real = realpath($fullPath);
        $imagesRoot = realpath(ALLSKY_IMAGES);
        if ($real === false || $imagesRoot === false || strpos($real, $imagesRoot . DIRECTORY_SEPARATOR) !== 0) {
            return null;
        }

        return $day . '/' . $filename;
    }

    private function folderPath(string $slug): string
    {
        return $this->foldersDir . '/' . $slug;
    }

    private function linkedImagePath(string $slug, string $relative): string
    {
        return $this->folderPath($slug) . '/' . str_replace('/', '__', $relative);
    }

    private function linkImageIntoFolder(string $slug, string $relative): void
    {
        $source = ALLSKY_IMAGES . '/' . $relative;
        $destination = $this->linkedImagePath($slug, $relative);
        if (file_exists($destination) || is_link($destination)) {
            return;
        }

        if (@symlink($source, $destination)) {
            return;
        }
        if (@link($source, $destination)) {
            return;
        }
        @copy($source, $destination);
    }

    private function removeLinkedImage(string $slug, string $relative): void
    {
        $path = $this->linkedImagePath($slug, $relative);
        if (file_exists($path) || is_link($path)) {
            @unlink($path);
        }
    }

    private function removeTree(string $directory): void
    {
        if (!is_dir($directory)) {
            return;
        }

        $entries = scandir($directory);
        if ($entries === false) {
            return;
        }

        foreach ($entries as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }
            $path = $directory . '/' . $entry;
            if (is_dir($path) && !is_link($path)) {
                $this->removeTree($path);
            } else {
                @unlink($path);
            }
        }
        @rmdir($directory);
    }

    private function readTensorFlowStatus(): array
    {
        $raw = @file_get_contents($this->tfStatusFile);
        $decoded = json_decode((string)$raw, true);
        if (!is_array($decoded)) {
            $decoded = [
                'state' => 'idle',
                'message' => 'TensorFlow trainer has not been started.',
                'updated' => gmdate(DATE_ATOM),
                'engine' => 'tensorflow',
                'progress' => 0,
            ];
        }
        $decoded['modelExists'] = file_exists($this->tfModelFile);
        $decoded['logExists'] = file_exists($this->tfLogFile);
        $decoded['pythonPath'] = $this->tfPython;
        $decoded['pythonExists'] = file_exists($this->tfPython);
        return $decoded;
    }

    private function writeJsonFile(string $filename, array $payload): void
    {
        $json = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        if ($json !== false) {
            @file_put_contents($filename, $json);
        }
    }

    private function startBackgroundProcess(array $argv, string $logFile): bool
    {
        $parts = array_map('escapeshellarg', $argv);
        $command = implode(' ', $parts) . ' >> ' . escapeshellarg($logFile) . ' 2>&1 &';
        @exec($command, $output, $code);
        return $code === 0;
    }
}

$aiUtil = new AIUTIL();
$aiUtil->run();
