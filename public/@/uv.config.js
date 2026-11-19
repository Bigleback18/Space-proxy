// Stable encoding keeps history and saved links valid across days and deployments.
self.__uv$config = {
    prefix: '/@/space/',
    encodeUrl: encodeURIComponent,
    decodeUrl: decodeURIComponent,
    handler: '/@/uv.handler.js',
    client: '/@/uv.client.js',
    bundle: '/@/uv.bundle.js',
    config: '/@/uv.config.js',
    sw: '/@/uv.sw.js',
};
