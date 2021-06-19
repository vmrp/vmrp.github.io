import iconv from 'iconv-lite';
import CRC32 from 'crc-32';
import pako from 'pako';

const mrp = {};

mrp.readFileFromMrp = function (data, pos, len) {
    return pako.ungzip(data.slice(pos, pos + len));
}

// type MRPHeader struct {
// 	Magic          [4]byte  // [0:4]     固定标识'MRPG'
// 	FileStart      uint32   // [4:8]     文件头的长度+文件列表的长度-8
// 	MrpTotalLen    uint32   // [8:12]    mrp文件的总长度
// 	MRPHeaderSize  uint32   // [12:16]   文件头的长度，通常是240，如果有额外数据则需要加上额外数据的长度
// 	FileName       [12]byte // [16:28]   GB2312编码带'\0'
// 	DisplayName    [24]byte // [28:52]   GB2312编码带'\0'
// 	AuthStr        [16]byte // [52:68]   编译器的授权字符串的第2、4、8、9、11、12、1、7、6位字符重新组合的一个字符串
// 	Appid          uint32   // [68:72]
// 	Version        uint32   // [72:76]
// 	Flag           uint32   // [76:80]   第0位是显示标志， 1-2位是cpu性能要求，所以cpu取值范围是0-3只对展讯有效， 第3位是否是shell启动的标志，0表示start启动，1表示shell启动
// 	BuilderVersion uint32   // [80:84]   应该是编译器的版本，从几个mrpbuilder看都是10002
// 	Crc32          uint32   // [84:88]   整个文件计算crc后写回，计算时此字段的值为0
// 	Vendor         [40]byte // [88:128]  GB2312编码带'\0'
// 	Desc           [64]byte // [128:192] GB2312编码带'\0'
// 	AppidBE        uint32   // [192:196] 大端appid
// 	VersionBE      uint32   // [196:200] 大端version
// 	Reserve2       uint32   // [200:204] 保留字段
// 	ScreenWidth    uint16   // [204:206] 在反编译的mrpbuilder中能看到有屏幕信息的字段，但是在斯凯提供的文档中并没有说明
// 	ScreenHeight   uint16   // [206:208]
// 	Plat           uint8    // [208:209] mtk/mstar填1，spr填2，其它填0
// 	Reserve3       [31]byte // [209:240]
// 	// ...       额外的数据，通常情况下没有
// }

function trim(s) {
    return s.replace(/^[\s\uFEFF\u0000\xA0]+|[\s\uFEFF\u0000\xA0]+$/g, '');
}

mrp.readMrpInfo = function (data) {
    const dv = new DataView(data.buffer);
    if (dv.getUint32(0, false) != 0x4D525047) {
        throw new Error('mrp head err');
    }
    const ret = {
        FileStart: dv.getUint32(4, true) + 8,
        MrpTotalLen: dv.getUint32(8, true),
        MRPHeaderSize: dv.getUint32(12, true),
        FileName: trim(iconv.decode(data.slice(16, 28), "GBK")),
        DisplayName: trim(iconv.decode(data.slice(28, 52), "GBK")),
        AuthStr: trim(iconv.decode(data.slice(52, 68), "GBK")),
        Appid: dv.getUint32(68, true),
        Version: dv.getUint32(72, true),
        Flag: dv.getUint32(76, true),
        BuilderVersion: dv.getUint32(80, true),
        Crc32: dv.getUint32(84, true),
        Vendor: trim(iconv.decode(data.slice(88, 128), "GBK")),
        Desc: trim(iconv.decode(data.slice(128, 192), "GBK")),
        AppidBE: dv.getUint32(192, false),
        VersionBE: dv.getUint32(196, false),
        ScreenWidth: dv.getUint16(204, true),
        ScreenHeight: dv.getUint16(206, true),
        Plat: dv.getUint8(208),
    };
    dv.setUint32(84, 0, true);
    const realCrc32 = (CRC32.buf(data) >>> 0);
    ret.Crc32OK = (ret.Crc32 === realCrc32); // 表示mrp记录的crc32与实际crc32不符
    ret.Crc32 = realCrc32; // 替换为实际crc32

    const files = [];
    let pos = ret.MRPHeaderSize;
    while (pos < ret.FileStart) {
        const fileNameLen = dv.getUint32(pos, true);
        pos += 4;
        const filename = trim(iconv.decode(data.slice(pos, pos + fileNameLen), 'GBK'));
        pos += fileNameLen;
        const filePos = dv.getUint32(pos, true)
        pos += 4;
        const fileLen = dv.getUint32(pos, true);
        pos += 4;
        pos += 4;
        files.push({ filename, filePos, fileLen })
    }
    ret.files = files;
    return ret;
}

window.mrp = mrp;
