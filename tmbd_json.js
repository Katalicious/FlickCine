require('dotenv').config();

const fs = require('fs').promises;
const path = require('path');  

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("TMDB_API_KEY não está definida nas variáveis de ambiente.");
    process.exit(1);
}

const BASE_URL = 'https://api.themoviedb.org/3';
const OUTPUT_FILE = path.join(__dirname, 'genres.json');


async function fetchGenres() {
    try {
        console.log("Procurando os géneros de filmes...");
        
        
        const response = await fetch(`${BASE_URL}/genre/movie/list?language=pt-PT&api_key=${API_KEY}`);

        if (!response.ok) {
            throw new Error(`Erro ao buscar géneros: ${response.statusText}`);
        }

        const data = await response.json();

        const genres = data.genres;
        const jsonString = JSON.stringify(data.genres, null, 2);
        
        await fs.writeFile(OUTPUT_FILE, jsonString, 'utf8');
        console.log(`Géneros salvos em ${OUTPUT_FILE}`);

        return genres;


    } catch (error) {
        console.error("Erro ao buscar géneros:", error);
        throw error;
    }
}

    fetchGenres();

