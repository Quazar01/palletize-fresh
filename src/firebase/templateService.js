import { configuredStorageBucket } from './firebaseConfig';

export const DEFAULT_TEMPLATE_STORAGE_PATH = 'templates/Plocklist-Template.xlsx';
export const DEFAULT_TEMPLATE_PUBLIC_PATH = '/templates/Plocklist-Template.xlsx';
const TEMPLATE_FETCH_TIMEOUT_MS = 15000;
const FALLBACK_TEMPLATE_PATHS = [
  DEFAULT_TEMPLATE_STORAGE_PATH
];

const FALLBACK_BUCKETS = [
  configuredStorageBucket,
  'plocklistare.appspot.com',
  'plocklistare.firebasestorage.app'
].filter((value, index, arr) => value && arr.indexOf(value) === index);

const withTimeout = (promise, timeoutMs, message) => {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
};

const buildFirebaseMediaUrl = (bucket, path) => {
  const encodedPath = encodeURIComponent(path);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
};

const fetchTemplateFromUrl = async ({ url, bucket, path }) => {
  const response = await withTimeout(
    fetch(url),
    TEMPLATE_FETCH_TIMEOUT_MS,
    `Timeout när mall hämtades från URL (${bucket}/${path})`
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} vid hämtning av mall (${bucket}/${path})`);
  }

  const blob = await response.blob();
  if (!blob || blob.size === 0) {
    throw new Error(`Mallfilen är tom (${bucket}/${path})`);
  }

  return new File(
    [blob],
    path.split('/').pop() || 'Plocklist-Template.xlsx',
    { type: blob.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  );
};

export const getDefaultTemplateFile = async () => {
  const attempts = [];

  try {
    const localFile = await fetchTemplateFromUrl({
      url: DEFAULT_TEMPLATE_PUBLIC_PATH,
      bucket: 'local-public',
      path: DEFAULT_TEMPLATE_STORAGE_PATH
    });

    return {
      file: localFile,
      path: DEFAULT_TEMPLATE_STORAGE_PATH,
      bucket: 'local-public',
      source: 'local-public',
      attempts
    };
  } catch (localError) {
    attempts.push({
      bucket: 'local-public',
      path: DEFAULT_TEMPLATE_STORAGE_PATH,
      code: localError?.code || 'unknown',
      message: localError?.message || 'Unknown local template error'
    });
  }

  for (const bucket of FALLBACK_BUCKETS) {
    for (const path of FALLBACK_TEMPLATE_PATHS) {
      try {
        const mediaUrl = buildFirebaseMediaUrl(bucket, path);
        const file = await fetchTemplateFromUrl({ url: mediaUrl, bucket, path });

        return {
          file,
          path,
          bucket,
          source: 'firebase-storage',
          attempts
        };
      } catch (error) {
        attempts.push({
          bucket,
          path,
          code: error?.code || 'unknown',
          message: error?.message || 'Unknown Firebase Storage error'
        });
      }
    }
  }

  const details = attempts
    .map((item) => `${item.bucket}/${item.path} -> ${item.code}`)
    .join(' | ');

  throw new Error(
    `Kunde inte ladda standardmall från public/Firebase. Försökte: ${details}`
  );
};
