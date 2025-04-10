const express = require('express');
const Gun = require('gun');
const app = express();
const port = 3030;

app.use(Gun.serve);

const server = app.listen(port, () => {
 console.log(`Example app listening at http://localhost:${port}`);
});

// Correct file path for persistence
Gun({ web: server, file: 'data.json' });