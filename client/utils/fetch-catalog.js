export const fetchCatalog = async() => {
    const catalogBase = process.env.catalogBase;
    const isRemote = catalogBase.startsWith("http");

    if (isRemote) {
        try {
            const res = await fetch(catalogBase + "/" + process.env.catalogFilename);
            const catalog = res.json()
            return catalog;
        } catch(error) {
            console.error("ERROR: Couldn't fetch catalog");
            console.error(error);
        }
    } else {
        const catalog = require('../public' + catalogBase + "/" + process.env.catalogFilename)
        return catalog;
    }

}