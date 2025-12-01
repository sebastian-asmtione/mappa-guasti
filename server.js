const express = require("express");
const fs = require("fs-extra");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PASSWORD = "asm2025";

// restituisce JSON interruzioni
app.get("/interruzioni.json", (req, res) => {
    res.sendFile(https://mappa-guasti-gojq.onrender.com + "/interruzioni.json");
});

// inserimento guasto
app.post("/inserisci", async (req, res) => {
    if (req.body.password !== PASSWORD) {
        return res.status(403).json({ error: "Password errata" });
    }

    const nuovo = {
        zona: req.body.zona,
        tipo: req.body.tipo,
        ripristino: req.body.ripristino,
        utenti: req.body.utenti,
        lat: req.body.lat,
        lng: req.body.lng
    };

    const dati = await fs.readJson("interruzioni.json");
    dati.push(nuovo);
    await fs.writeJson("interruzioni.json", dati, { spaces: 2 });

    res.json({ ok: true });
});

// reset totale
app.get("/reset", async (req, res) => {
    await fs.writeJson("interruzioni.json", [], { spaces: 2 });
    res.send("Interruzioni cancellate");
});

app.listen(3000, () => console.log("Backend attivo"));


