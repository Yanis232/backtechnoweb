require('dotenv').config(); // Charger les informations de info.env
const express = require('express'); // Créer et gérer le serveur web
const mysql = require('mysql'); // Se connecter à la base de données
const cors = require('cors'); // Recommandé pour gérer certaines API
const path = require('path'); // Ajoute cette ligne pour définir 'path'

require('dotenv').config({ path: './info.env' }); // Éviter les problèmes de chemins

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json()); // Analyser les requêtes POST
app.use(express.urlencoded({ extended: true }));

// Middleware pour servir les fichiers statiques (images)

app.use('/images', express.static('images'));

//app.use('/images', express.static(path.join(__dirname, 'public/images')));


// Connexion à la base de données "dbtechnoback"
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

db.connect((err) => {
    if (err) {
        console.error("Erreur de connexion à la database :", err);
        return;
    }
    console.log('Connexion réussie à la DB de MySQL');
});

// Test serveur
app.get('/', (req, res) => {
    res.send('Le serveur node.js est fonctionnel');
});

// Middleware pour vérifier si l'utilisateur est admin
function checkAdminRole(req, res, next) {
    const { role } = req.body; // Le rôle devrait être passé depuis le front-end ou vérifié via JWT
    if (role !== 'admin') {
        return res.status(403).json({ message: "Accès refusé. Droits insuffisants." });
    }
    next();
}

const bcrypt = require('bcrypt'); // Importer bcrypt

app.post('/register', async (req, res) => {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: "Les champs nom d'utilisateur, email, et mot de passe sont requis." });
    }

    try {
        // Hachage du mot de passe
        const saltRounds = 10; // Nombre de rounds de salage (sécurité)
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        console.log("Mot de passe original :", password);
        console.log("Mot de passe haché :", hashedPassword);


        const query = 'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)';
        const userRole = role || 'user';

        db.query(query, [username, email, hashedPassword, userRole], (err, result) => {
            if (err) {
                console.error("Erreur lors de l'ajout de l'utilisateur :", err);
                return res.status(500).json({ message: "Erreur lors de l'ajout de l'utilisateur" });
            }
            res.status(201).json({ message: 'Utilisateur créé avec succès', role: userRole });
        });
    } catch (error) {
        console.error("Erreur lors du hachage du mot de passe :", error);
        res.status(500).json({ message: "Erreur interne lors de la création de l'utilisateur." });
    }
});



app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Nom d'utilisateur et mot de passe requis." });
    }

    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], async (err, results) => {
        if (err) {
            console.error("Erreur lors de la connexion :", err);
            return res.status(500).json({ message: 'Erreur lors de la connexion' });
        }

        if (results.length === 0) {
            return res.status(401).json({ message: "Nom d'utilisateur ou mot de passe incorrect." });
        }

        const user = results[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ message: "Nom d'utilisateur ou mot de passe incorrect." });
        }

        res.json({
            message: 'Connexion réussie!',
            role: user.role, // Retourner le rôle pour le front-end
        });
    });
});

// Route DELETE pour supprimer un utilisateur (admin uniquement)
app.delete('/delete-user/:id', checkAdminRole, (req, res) => {
    const userId = req.params.id;

    const query = 'DELETE FROM users WHERE id = ?';
    db.query(query, [userId], (err, result) => {
        if (err) {
            console.error("Erreur lors de la suppression de l'utilisateur :", err);
            return res.status(500).json({ message: "Erreur serveur." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Utilisateur non trouvé." });
        }

        res.json({ message: "Utilisateur supprimé avec succès." });
    });
});

// Ajout d'un produit
app.post('/api/products', (req, res) => {
    const { name, price, description, image_url, category } = req.body;

    // Vérifier que l'image_url est valide (ajouter un contrôle ici si nécessaire)
    if (!image_url || !name || !price || !description || !category) {
        return res.status(400).json({ message: 'Tous les champs sont requis' });
    }

    const query = 'INSERT INTO products (name, price, description, image_url, category) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [name, price, description, image_url, category], (err, result) => {
        if (err) {
            console.error('Erreur lors de l\'ajout du produit :', err);
            return res.status(500).json({ message: 'Erreur lors de l\'ajout du produit' });
        }
        res.status(200).json({ message: 'Produit ajouté avec succès' });
    });
});


// Route pour récupérer tous les produits
app.get('/api/products', (req, res) => {
    const query = 'SELECT * FROM products';
    db.query(query, (err, result) => {
        if (err) {
            console.error('Erreur lors de la récupération des produits:', err);
            return res.status(500).json({ message: 'Erreur lors de la récupération des produits' });
        }
        res.status(200).json(result);  // Renvoie la liste des produits au format JSON
    });
});




// Route pour supprimer un produit
app.delete('/api/products/:id', (req, res) => {
    const productId = req.params.id;

    const query = 'DELETE FROM products WHERE id = ?';
    db.query(query, [productId], (err, result) => {
        if (err) {
            console.error('Erreur lors de la suppression du produit :', err);
            return res.status(500).json({ message: 'Erreur lors de la suppression du produit' });
        }
        res.status(200).json({ message: 'Produit supprimé avec succès' });
    });
});

// Route pour récupérer un produit spécifique par son ID
app.get('/api/products/:id', (req, res) => {
    const productId = req.params.id;

    const query = 'SELECT * FROM products WHERE id = ?';
    db.query(query, [productId], (err, result) => {
        if (err) {
            console.error('Erreur lors de la récupération du produit :', err);
            return res.status(500).json({ message: 'Erreur serveur lors de la récupération du produit' });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: 'Produit non trouvé' });
        }

        res.status(200).json(result[0]);  // Renvoie le produit spécifique au format JSON
    });
});


// // Récupérer les articles par catégorie (admin vers shop)
// app.get('/api/products/category/:categoryId', (req, res) => {
//     const categoryId = req.params.categoryId;  // Récupère l'ID de la catégorie depuis l'URL
//     console.log('ID de la catégorie demandé :', categoryId);

//     // Requête SQL pour récupérer les produits ayant la catégorie spécifiée
//     db.query('SELECT * FROM products WHERE category = ?', [categoryId], (err, results) => {
//         if (err) {
//             console.error('Erreur SQL:', err.message);
//             return res.status(500).json({ error: err.message });
//         }

//         if (results.length === 0) {
//             return res.status(404).json({ message: 'Aucun produit trouvé pour cette catégorie' });
//         }

//         res.json(results);  // Retourne les produits trouvés
//     });
// });

app.get('/api/products/category/:categoryId', (req, res) => {
    const categoryId = req.params.categoryId;
    db.query('SELECT * FROM products WHERE category = ?', [categoryId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});



app.put('/api/products/:id', (req, res) => {
    const productId = req.params.id;
    const { name, price, description, image_url, category } = req.body;

    // Vérifiez que tous les champs requis sont fournis
    if (!name || !price || !description || !image_url || !category) {
        return res.status(400).json({ message: 'Tous les champs sont requis' });
    }

    const query = 'UPDATE products SET name = ?, price = ?, description = ?, image_url = ?, category = ? WHERE id = ?';
    db.query(query, [name, price, description, image_url, category, productId], (err, result) => {
        if (err) {
            console.error('Erreur lors de la mise à jour du produit :', err);
            return res.status(500).json({ message: 'Erreur serveur' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Produit non trouvé' });
        }

        res.status(200).json({ message: 'Produit mis à jour avec succès' });
    });
});




app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
