
function GetQueryString(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
    var r = window.location.search.substr(1).match(reg);
    if (r != null) return decodeURI(r[2]);
    return null;
}


function download(buf, filename) {
    const url = window.URL.createObjectURL(new Blob([buf], {
        type: "application/octet-stream"
    }));
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


function getData(url, cb) {
    const httpRequest = new XMLHttpRequest();
    httpRequest.responseType = 'arraybuffer';
    
    httpRequest.onreadystatechange = function () {
        if (httpRequest.readyState === XMLHttpRequest.DONE) {
            if (httpRequest.status === 200) {
                cb(httpRequest.response);
            }
        }
    }
    httpRequest.open('GET', url);
    httpRequest.send();
}

function getBytes(v) {
    const uint8 = new Uint8Array(4);
    const dv = new DataView(uint8.buffer);
    dv.setUint32(0, v, true);
    return uint8;
}