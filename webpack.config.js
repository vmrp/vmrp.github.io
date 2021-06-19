const path = require('path');

module.exports = {
    entry: './src/mrp.js',
    output: {
        filename: 'mrp.js',
        path: path.resolve(__dirname, 'dist')
    },
    resolve: {
        fallback: {
            "string_decoder": require.resolve("string_decoder/"),
            "buffer": require.resolve("buffer/"),
        },
    },
};