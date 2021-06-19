
let mrpFile = null;
const midi = MidiPlayer();
const f = GetQueryString('f');

function isGzip(data, pos) {
    return ((data[pos] === 0x1F) && (data[pos + 1] === 0x8B));
}

const app = new Vue({
    el: '#app',
    data: {
        f: f,
        info: {
            FileStart: 0,
            MrpTotalLen: 0,
            MRPHeaderSize: 0,
            FileName: '',
            DisplayName: '',
            AuthStr: '',
            Appid: 0,
            AppidBE: 0,
            Version: 0,
            VersionBE: 0,
            Flag: 0,
            BuilderVersion: 0,
            Crc32: 0,
            Crc32OK: false,
            Vendor: '',
            Desc: '',
            ScreenWidth: 0,
            ScreenHeight: 0,
            Plat: 0,
        },
        audio: null,
        currentItem: null,
        files: [],
        textShow: {
            title: 'title',
            text: '',
        },
        bmp: {
            filename: '',
            w: 0, h: 0,
            buf: null,
            url: null,
        },
    },
    methods: {
        download: async function (item) {
            const buf = mrp.readFileFromMrp(mrpFile, item.filePos, item.fileLen)
            download(buf, item.filename);
        },
        isSound: function (item) {
            const v = item.filename.toLowerCase();
            return v.endsWith('.mid') || v.endsWith('.mp3') || v.endsWith('.wav');
        },
        play: function (item) {
            const buf = mrp.readFileFromMrp(mrpFile, item.filePos, item.fileLen)
            const ext = item.filename.toLowerCase().substr(-4);
            switch (ext) {
                case '.mid':
                    midi.play(buf.buffer, false);
                    break;
                case '.mp3':
                case '.wav': {
                    const blob = new Blob([buf], { type: "audio/" + ext.substring(1) });
                    const url = window.URL.createObjectURL(blob);
                    if (this.audio !== null) {
                        this.audio.target.pause();
                        window.URL.revokeObjectURL(this.audio.url);
                    }
                    this.audio = {
                        target: new Audio(url),
                        url: url,
                    }
                    this.audio.target.play();
                }
            }
        },
        stop: function (item) {
            const ext = item.filename.toLowerCase().substr(-4);
            switch (ext) {
                case '.mid':
                    midi.stop();
                    break;
                case '.mp3':
                case '.wav':
                    this.audio.target.pause();
            }
        },
        show: function (item) {
            if (this.currentItem === item) {
                return;
            }
            this.currentItem = item;

            let buf = null;
            if (isGzip(mrpFile, item.filePos)) {
                buf = mrp.readFileFromMrp(mrpFile, item.filePos, item.fileLen)
            } else {
                buf = mrpFile.slice(item.filePos, item.filePos + item.fileLen);
            }
            const ext = item.filename.toLowerCase().substr(-4);
            if (ext === '.txt') {
                this.textShow.title = item.filename;
                this.textShow.text = new TextDecoder('gbk').decode(buf);
            } else if (ext === '.bmp') {
                this.bmp.buf = buf;
                this.bmp.filename = item.filename;
                const o = makeBmp(this.bmp.buf);
                this.showBmp(o);
            }
        },
        showBmp: function (o) {
            const blob = new Blob([o.data], { type: "image/bmp" });
            this.bmp.w = o.w;
            this.bmp.h = o.h;

            if (this.bmp.url) {
                window.URL.revokeObjectURL(this.bmp.url);
                this.bmp.url = null;
            }
            this.bmp.url = window.URL.createObjectURL(blob);
        },
        btnBmpDecr: function () {
            if (this.bmp.url) {
                const o = makeBmp(this.bmp.buf, this.bmp.w, -1);
                this.showBmp(o);
            }
        },
        btnBmpIncr: function () {
            if (this.bmp.url) {
                const o = makeBmp(this.bmp.buf, this.bmp.w, +1);
                this.showBmp(o);
            }
        },
        importFileBtn: function () {
            const inputFile = document.getElementById('files');
            inputFile.click();
        },
        importFile: async function (e) {
            try {
                for (const file of e.target.files) {
                    await readFile(file);
                }
            } catch (err) {
                console.error(err);
            }
        },
        downloadBmp: function () {
            if (this.bmp.url) {
                const link = document.createElement('a');
                link.style.display = 'none';
                link.href = this.bmp.url;
                link.setAttribute('download', this.bmp.filename);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        }
    }
});

function appendBuffer(buffer1, buffer2) {
    const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
}

function isFloat(n) {
    return ~~n !== n;
}

function derivationSize(dataLen, w, step = 1) {
    const target = dataLen / 2; // 每像素两字节
    while (w > 0 && w < target) {
        for (let h = 1; true; h++) {
            const v = w * h;
            if (v === target) {
                return { w: w, h: h };
            } else if (v > target) {
                break;
            }
        }
        w += step;
    }
    throw new Error('invalid width');
}

function makeBmp(buf, w = 0, step = 1) {
    const dataLen = buf.byteLength;
    const fileLen = 54 + dataLen;
    let h = 0;
    if (w === 0) {
        const v = Math.sqrt(dataLen / 2);
        if (isFloat(v)) {
            w = ~~v; // 取整，假设一个宽度
            const r = derivationSize(dataLen, w, step);
            w = r.w;
            h = r.h;
        } else {
            w = h = v;
        }
    } else {
        const r = derivationSize(dataLen, w + step, step);
        w = r.w;
        h = r.h;
    }

    const biSize = 56;
    const bfOffBits = 14 + biSize;
    const dv = new DataView(new ArrayBuffer(bfOffBits));
    // BITMAPFILEHEADER
    dv.setUint16(0x00, 0x424D, false);// bfType
    dv.setUint32(0x02, fileLen, true);// bfSize
    dv.setUint16(0x06, 0x0, true);// bfReserved1
    dv.setUint16(0x08, 0x0, true);// bfReserved2
    dv.setUint32(0x0A, bfOffBits, true); // bfOffBits

    // BITMAPV3INFOHEADER
    dv.setUint32(0x0E, biSize, true); // biSize
    dv.setInt32(0x12, w, true); // biWidth
    dv.setInt32(0x16, -h, true); // biHeight
    dv.setUint16(0x1A, 1, true); // biPlanes
    dv.setUint16(0x1C, 16, true); // biBitCount
    dv.setUint32(0x1E, 3, true); // biCompression
    dv.setUint32(0x22, dataLen, true); // biSizeImage
    dv.setUint32(0x26, 2835, true); // biXPelsPerMeter
    dv.setUint32(0x2A, 2835, true); // biYPelsPerMeter
    dv.setUint32(0x2E, 0, true); // biClrUsed
    dv.setUint32(0x32, 0, true); // biClrImportant
    dv.setUint32(0x36, 0xF800, true); // biRedMask
    dv.setUint32(0x3A, 0x07E0, true); // biGreenMask
    dv.setUint32(0x3E, 0x001F, true); // biBlueMask
    dv.setUint32(0x42, 0x0000, true); // biAlphaMask

    // BMP数据的每一行必需能被4整除，mrp中的图片对行的对齐字节也进行了删除，所以需要补
    if (w % 2) { // 如果是奇数宽，则每行需要补两个0字节才能满足4字节对齐的要求
        const t = new Uint8Array((w + 1) * h * 2);
        const tLineBytes = (w + 1) * 2;
        const s = new Uint8Array(buf);
        const sLineBytes = w * 2;
        for (let i = 0; i < h; i++) {
            const sOffset = i * sLineBytes;
            t.set(s.slice(sOffset, sOffset + sLineBytes), i * tLineBytes)
        }
        buf = t;
    }
    return { w, h, data: appendBuffer(dv.buffer, buf) };
}


getData(f, parseData);

function parseData(data) {
    mrpFile = new Uint8Array(data);
    const ret = mrp.readMrpInfo(mrpFile);
    app.info.FileStart = ret.FileStart;
    app.info.MrpTotalLen = ret.MrpTotalLen;
    app.info.MRPHeaderSize = ret.MRPHeaderSize;
    app.info.FileName = ret.FileName;
    app.info.DisplayName = ret.DisplayName;
    app.info.AuthStr = ret.AuthStr;
    app.info.Appid = ret.Appid;
    app.info.AppidBE = ret.AppidBE;
    app.info.Version = ret.Version;
    app.info.VersionBE = ret.VersionBE;
    app.info.Flag = ret.Flag;
    app.info.BuilderVersion = ret.BuilderVersion;
    app.info.Crc32 = ret.Crc32;
    app.info.Crc32OK = ret.Crc32OK;
    app.info.Vendor = ret.Vendor;
    app.info.Desc = ret.Desc;
    app.info.ScreenWidth = ret.ScreenWidth;
    app.info.ScreenHeight = ret.ScreenHeight;
    app.info.Plat = ret.Plat;

    app.files = ret.files;
}

function readFile(file) {
    return new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.onerror = function () {
            reject(reader.error);
        }
        reader.onload = async function () {
            parseData(reader.result);
            resolve();
        };
        reader.readAsArrayBuffer(file);
    });
}





