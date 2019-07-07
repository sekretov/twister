const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const Sequelize = require('sequelize');
const bcrypt = require('bcrypt');
require('dotenv').config();

const port = process.env.TWISTER_PORT;


const sequelize = new Sequelize({        
    host: process.env.TWISTER_DB_HOST,  
    port: process.env.TWISTER_DB_PORT,
    username: process.env.TWISTER_DB_USER,
    password: process.env.TWISTER_DB_PASSWORD,	
    database: process.env.TWISTER_DB_NAME,
    dialect: process.env.TWISTER_DB_DIALECT
});

const User = sequelize.define('user', { 
    'login' : {
        'type' : Sequelize.STRING,      
        'allowNull' : false,            
        'unique'    : true              
    },
    'password' : {
        'type' : Sequelize.STRING,      
        'allowNull' : false 
    },
    'admin' : {
        'type' : Sequelize.BOOLEAN,     
        'allowNull' : false,
        'defaultValue' : false          
    }
});               

const Twit = sequelize.define('twit', {  
    'message' : {                            
        'type' : Sequelize.STRING,        
        'allowNull' : false             
    }
});

User.hasMany(Twit);                   
Twit.belongsTo(User);                   

const app = express();
app.set('view engine', 'ejs');          
app.use(bodyParser.urlencoded({ extended: false}));
app.use(express.static('public'));
app.use(session({
    secret: process.env.TWISTER_SESSION_SECRET, 
    resave: false,
    saveUninitialized: true 
}));

app.get('/', (request, response) => {      
    Twit.findAll().then(results => {    
        response.format({                   //теперь будет отправлять информацию в зависимости от запроса json или html
            'text/html' : function() {
                response.render('index', { 'twits': results, 'session' : request.session });
            },
            'application/json' : function() { 
                response.json(results); // TODO сделать зачистку, sanityze. 
            }
        });
    }).catch(error => {                
        console.error(error);
        response.status(500).end;       
    }); 
});                                                         
                                                               

app.post('/', (request, response) => {    
    if(!request.session.authorized) {   
        console.error('Attempt to unauthorized tweet creation');           
        response.status(401).end; 
        return;
    }
    Twit.create({ 
        'message' : request.body.message,
        'userId' : request.session.userId
    }).then(() => { 
        response.redirect('/'); 
    }).catch(error => { 
        console.error(error);
        response.status(500).end; 
    });    
   
});

app.get('/register', (request, response) => { 
    response.render('registration', {'session' : request.session}); 
}); 

app.post('/register', (request, response) => { 
    const login = request.body.login;       
    const password = request.body.password;  
    const passwordRepeat = request.body['password-repeat']; 

    if (password !== passwordRepeat) { 
        request.session.error = 'Password are not same, please try again'
        response.redirect('/register');
    
        return; 
    }

    User.create({  
        'login' : login,           
        'password' : bcrypt.hashSync(password, +process.env.TWISTER_PASSWORD_SALT_ROUND)       
    }).then(user => { 
        request.session.authorized = true;  
        request.session.login = login;      
        request.session.userId = user.id;   
        response.redirect('/'); 
    }).catch(error => { 
            console.error(error); 
            response.status(500).end; 
    }); 
});    

app.get('/login', (request, response) => { 
    response.render('login', {'session' : request.session});
}); 

app.post('/login', (request, response) => { 
    const login = request.body.login;       
    const password = request.body.password;  

    User.findOne({  
        'where' : { 'login' : login },              
    }).then(user => { 
        if (!user || !bcrypt.compareSync(password, user.password)) { 
            request.session.error = 'Failed to login. Wrong login or password.'  
            response.redirect('/login');

            return; 
        }

        request.session.authorized = true; 
        request.session.login = user.login;    
        request.session.userId = user.id;  
        request.session.userAdm = user.admin; 
        response.redirect('/'); 
    }).catch(error => { 
            console.error(error); 
            response.status(500).end; 
        //}    
    }); 
}); 

app.get('/logout', (request, response) => { 
    request.session.regenerate(() => {       
        response.redirect('/');            
    })
});

app.post('/twit/:twitID/delete', (request, response) => {
    const twitID = request.params['twitID'];
    console.log(twitID);
    Twit.destroy({
        where: {
          id: twitID
        }
    }).then(() => {
        response.redirect('/');
    });
});

sequelize.sync().then(() => { 
    User.upsert({  
        'login' : process.env.TWISTER_ADMIN_LOGIN, 
        'password' : bcrypt.hashSync(process.env.TWISTER_ADMIN_PASSWORD, +process.env.TWISTER_PASSWORD_SALT_ROUND), 
        'admin' : true
    }).then(() => {
        app.listen(port, () => console.log(`Example app listening on port ${port}!`)); 
    });
});
