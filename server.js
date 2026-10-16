const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PASSWORD = process.env.INSERT_PASSWORD || "asm2025";

const OWNER = "sebastian-asmtione";
const REPO = "mappa-guasti";
const FILE_PATH = "interruzioni.json";
const BRANCH = process.env.GITHUB_BRANCH || "main";

const GITHUB_URL =
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;

function githubHeaders() {
    if (!process.env.GITHUB_TOKEN) {
        throw new Error("Variabile GITHUB_TOKEN non configurata su Render");
    }

    return {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json"
    };
}

// Legge interruzioni.json direttamente da GitHub
async function leggiInterruzioni() {
    const response = await fetch(
        `${GITHUB_URL}?ref=${encodeURIComponent(BRANCH)}`,
        { headers: githubHeaders() }
    );

    if (!response.ok) {
        const dettaglio = await response.text();
        throw new Error(
            `Lettura GitHub fallita (${response.status}): ${dettaglio}`
        );
    }

    const file = await response.json();

    if (!file.content || !file.sha) {
        throw new Error("GitHub non ha restituito il contenuto del file");
    }

    const contenuto = Buffer.from(file.content, "base64").toString("utf8");
    const dati = JSON.parse(contenuto);

    if (!Array.isArray(dati)) {
        throw new Error("interruzioni.json non contiene un array JSON");
    }

    return { dati, sha: file.sha };
}

// Scrive su GitHub e crea un commit
async function salvaSuGitHub(dati, sha) {
    const contenuto = Buffer.from(
        JSON.stringify(dati, null, 2),
        "utf8"
    ).toString("base64");

    const response = await fetch(GITHUB_URL, {
        method: "PUT",
        headers: githubHeaders(),
        body: JSON.stringify({
            message: "Aggiornamento interruzioni mappa guasti ASM",
            content: contenuto,
            sha: sha,
            branch: BRANCH
        })
    });

    if (!response.ok) {
        const dettaglio = await response.text();
        throw new Error(
            `Scrittura GitHub fallita (${response.status}): ${dettaglio}`
        );
    }

    return await response.json();
}

// Verifica che il backend sia attivo
app.get("/", (req, res) => {
    res.send("Backend mappa guasti ASM attivo");
});

// Restituisce i dati salvati su GitHub
app.get("/interruzioni.json", async (req, res) => {
    try {
        const { dati } = await leggiInterruzioni();
        res.set("Cache-Control", "no-store");
        res.json(dati);
    } catch (err) {
        console.error("Errore lettura interruzioni:", err.message);
        res.status(502).json({
            error: "Impossibile leggere le interruzioni da GitHub"
        });
    }
});

// Aggiunge un'interruzione e conferma solo dopo il commit GitHub
app.post("/inserisci", async (req, res) => {
    try {
        if (req.body.password !== PASSWORD) {
            return res.status(403).json({ error: "Password errata" });
        }

        const { dati, sha } = await leggiInterruzioni();

        const nuovo = {
            zona: req.body.zona,
            tipo: req.body.tipo,
            ripristino: req.body.ripristino,
            utenti: req.body.utenti,
            lat: req.body.lat,
            lng: req.body.lng
        };

        dati.push(nuovo);

        const risultato = await salvaSuGitHub(dati, sha);

        console.log(
            "Interruzione salvata su GitHub. Commit:",
            risultato.commit?.sha || "creato"
        );

        res.json({ ok: true });
    } catch (err) {
        console.error("Errore inserimento interruzione:", err.message);
        res.status(500).json({
            error: "Salvataggio su GitHub non riuscito. Verificare i log di Render."
        });
    }
});

// Avvio del server su Render
const PORT = process.env.PORT || 3000;

// Reset totale su GitHub, compatibile con il pulsante esistente
app.get("/reset", async (req, res) => {
    try {
        const { sha } = await leggiInterruzioni();
        await salvaSuGitHub([], sha);
        res.send("Interruzioni cancellate");
    } catch (err) {
        console.error("Errore reset:", err.message);
        res.status(500).send("Errore durante il reset");
    }

app.listen(PORT, () => {
    console.log(`Backend mappa guasti ASM attivo sulla porta ${PORT}`);
});



