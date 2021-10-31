export default function ShortAddress({ address, chars }) {  
    const l = chars || 4;
    const a = (address || "").toLowerCase();
    return (     
        <>
            {a.substr(0, l+2)}{"…"}{a.substr(address.length - l)}
        </> 
    )
}