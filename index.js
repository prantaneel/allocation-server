require('dotenv').config()
const dbclient = require('@libsql/client')
const cors = require('cors');
const express = require('express');

const app = express();

app.use(cors());
app.use(express.json());

const turso = dbclient.createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

app.get('/', async (req, res) => {
    try{
        const data = await turso.execute("SELECT * FROM allocation");
        res.send(data);
    } catch(error) {
        res.status(500).send(error.message);
    }
})

//get data from product_catalog table
app.get('/product_catalog', async (req, res) => {
    
    try {
        const data = await turso.execute( "SELECT * FROM product_catalog" );
        res.send(data);
    } catch(error){
        res.status(500).send({"error": error.message});
    }
})
app.get('/daily_record', async (req, res) => {
    let date = req.query.date;
    if( !date ){
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are zero-based
        const year = today.getFullYear();
        date = `${day}/${month}/${year}`;
    }
    try {
        const data = await turso.execute( `SELECT * FROM daily_record WHERE date = '${date}'` );
        return res.send(data);
    } catch(error){
        return res.status(500).send({"error": error.message});
    }
})

app.post('/daily_record', async (req, res) => {
    let {date, data} = req.body;
    payload = JSON.stringify(data);
    console.log(payload);
    try {
        const countOf = await turso.execute( `SELECT COUNT(*) FROM daily_record WHERE date = '${date}'` );
        if(countOf["rows"][0][countOf["columns"][0]]){
            //already exists --> Update this
            const data = await turso.execute( `UPDATE daily_record SET data = '${payload}' WHERE date = '${date}'` );
        } else {
            const data = await turso.execute( `INSERT INTO daily_record (date, data) VALUES ('${date}', '${payload}')` );
        }
        return res.status(200).json({
            message: 'Data received successfully',
          });
    } catch(error){
        return res.status(500).send({"error": error.message});
    }
    
})
app.post('/product_catalog', async(req, res) => {
    const products = req.body;
    let query = `INSERT INTO product_catalog (name, cal, protein, carb, fat, taste, fill) VALUES `;
    products.forEach(element => {
        const {name, cal, protein, carb, fat, taste, fill} = element
        query += `('${name}', '${cal}', '${protein}', '${carb}', '${fat}', '${taste}', ${fill}),`;
    });
    query = query.slice(0, -1);
    try {
        const result = await turso.execute("DELETE FROM product_catalog");
        if(!products.length)
            return res.status(200)
        const data = await turso.execute( query );
        return res.status(200).json({
                message: 'Data received successfully',
              });
    } catch(error){
        return res.status(500).send({"error": error.message});
    }
    
})


const port = process.env.PORT || 4000;

app.listen(port, () => console.log('server running'));