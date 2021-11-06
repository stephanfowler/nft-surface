const catalogURL = process.env.catalogBaseURL + "/" + process.env.catalogFilename;

let catalogMemo;

export const fetchCatalog = async() => {
    if (catalogMemo) {
        return catalogMemo;
    } else {
        try {
            const res = await fetch(catalogURL);
            catalogMemo = res.json()
            return catalogMemo;
        } catch(error) {
            console.error("ERROR: Couldn't fetch catalog");
            console.error(error);
        }
    }
}