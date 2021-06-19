const inputFile = document.getElementById('files');


localforage.config({
    name: 'NeDB',
    storeName: 'nedbdata'
});

const app = new Vue({
    el: '#app',
    data: {
        admin: false,
        items: [],
        page: 1,
        pageSize: 50,
        total: 0,
        totalPage: 0,
        searchText: '',
    },
    methods: {
        search: function () {
            this.searchText = document.getElementById('search').value;
            this.page = 1;
            showList();
        },
        del: async function (item) {
            try {
                await db.remove({ _id: item._id });
                await showList();
            } catch (err) {
                console.log(err);
            }
        },
        importFile: function () {
            inputFile.click();
        },
        downloadData: function () {
            localforage.getItem('mrpdb', function (err, value) {
                if (err) {
                    console.log(err);
                    return;
                }
                const encoder = new TextEncoder();
                const view = encoder.encode(value);
                download(view, "data.txt");
            });
        },
        prev() {
            if (this.page > 1) {
                this.page--;
                showList();
            }
        },
        next() {
            if (this.page < this.totalPage) {
                this.page++;
                showList();
            }
        }
    }
});

getData('/public/data.txt', function (data) {
    const decoder = new TextDecoder();
    localforage.setItem('mrpdb', decoder.decode(data), async function (err, v) {
        try {
            db.newDB();
            await showList();
        } catch (err) {
            console.log(err);
        }
    });
})

async function showList() {
    let cond = {};
    let search = app.searchText;
    if (search) {
        search = new RegExp(search);
        cond = {
            $or: [
                { DisplayName: search },
                { Vendor: search },
                { Desc: search }
            ]
        };
    }
    app.items = await db.getData(cond, app.page, app.pageSize);
    app.total = await db.count(cond);
    app.totalPage = Math.ceil(app.total / app.pageSize);
}



function readFile(file) {
    return new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.onerror = function () {
            reject(reader.error);
        }
        reader.onload = async function () {
            const ret = mrp.readMrpInfo(new Uint8Array(reader.result));
            ret.file = file.name;
            delete ret.files;
            try {
                const r = await db.findOne({ DisplayName: ret.DisplayName, Crc32: ret.Crc32 });
                if (r) {
                    console.log("exists: " + ret.file);
                } else {
                    await db.insert(ret)
                }
                resolve();
            } catch (err) {
                reject(err);
            }
        };
        reader.readAsArrayBuffer(file);
    });
}

inputFile.addEventListener('change', async function (ev) {
    try {
        for (const file of inputFile.files) {
            await readFile(file);
        }
        await showList();
    } catch (err) {
        console.error(err);
    }
});
