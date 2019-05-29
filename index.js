const express = require('express');
const app = express();
//const mysql = require('mysql2'); этот require больше не нужен, заменили на sequelize, но mysql2 всегда надо устанавливать
const Sequelize = require('sequelize');
const bodyParser = require('body-parser');
require('dotenv').config();

const port = process.env.TWISTER_PORT;

/*const connection = mysql.createConnection({ //подключили базу данных
    host: TWISTER_DB_HOST, //Поменяли все данные с помощью dotenv .env
    port: TWISTER_DB_PORT,
    username: TWISTER_DB_USER,
    password: TWISTER_DB_PASSWORD,	
    database: TWISTER_DB_NAME
});*/

const sequelize = new Sequelize({ //подключили sequelize вместо обычной mysql2. 
    host: process.env.TWISTER_DB_HOST, //Поменяли все данные с помощью dotenv .env
    port: process.env.TWISTER_DB_PORT,
    username: process.env.TWISTER_DB_USER,
    password: process.env.TWISTER_DB_PASSWORD,	
    database: process.env.TWISTER_DB_NAME,
    dialect: process.env.TWISTER_DB_DIALECT
});

const User = sequelize.define('user', { //определи модель в sql создай таблицу.
    'login' : {
        'type' : Sequelize.STRING,      // как и раньше, строка
        'allowNull' : false,            // не пустой
        'unique'    : true              // в workbench unique index. Уникальный индекс нужен для логина    
    },
    'password' : {
        'type' : Sequelize.STRING,      // как и раньше, строка
        'allowNull' : false, 
    },
    'admin' : {
        'type' : Sequelize.BOOLEAN,     // создаем админа, булевое значение
        'allowNull' : false,
        'defaultValue' : false          // по умолчанию пользователи не создаются админами, ставим это поле
    }
})               

const Twit = sequelize.define('twit', { // sequelize создала модель и может воссоздать таблицу в mysql при утере или переезде
    'message' : {                        //    
        'type' : Sequelize.STRING,       // чаще всего Sequelize.STRING даже если в workbench отличается.
        'allowNull' : false              // allowNull - галочка в NotNull в MySQL workbench.    
    }
});

User.hasMany(Twit); // Will add userId to Task model
Twit.belongsTo(User); // Will also add userId to Task model

app.set('view engine', 'ejs'); //запрос нашего ejs
app.use(bodyParser.urlencoded({ extended: false})); //запрос библиотеки body parser
app.use(express.static('public'));

app.get('/', (_, response) => { //запрос на получение информации с сервена на ejs клиент и запрос с базы данных.
    Twit.findAll().then(results => { //найти все твиты с константой const Twit, созданной выше
        response.render('index', { 'twits': results }); // .render тоже метод express. 
    }).catch(error => { // .catch это команда sequelize, для ловли ошибок, 
        console.error(error);
        response.status(500).end; // .status и .end тоже метод express. ошибку нужную выбираем. statu покажет ошибку, если есть
    });                           // end завершит запрос. Ошибка уйдет в браузер.
   
   
    /*connection.query('SELECT * FROM twits', (error, results) => {  // подключение к базе данных
            if (error) {
                console.error(error);
                return;
            }

            response.render('index', { 'twits': results });  // отправка снова к документу index.ejs, в results теперь все твиты    
    }); */                                                     // с базы данных там она переносится в twits и через перебор for of
});                                                          // и неупоряд. список <ul> <li> отображается значение `twits` 
                                                             // то есть каждого twit. А метод .message возвращает сам текст   

                                                             app.post('/', (request, response) => {    //запрос в поста ejs action post, в request сейчас хранится сообщение твита,
    //const message = request.body.message; // через body.message сообщение твита переводится в обьект и идет в message
    // Create a new user
    Twit.create({ 'message' : request.body.message }).then(() => { //Twit - константа. _ - эта переменная не нужна, мы ее оставим формально
        response.redirect('/'); // перенаправление к запросу get. Таким образом заменили connection.query mysql2 и здесь.
    }).catch(error => { // .catch это команда sequelize, для ловли ошибок, 
        console.error(error);
        response.status(500).end; // такая же обработка ошибок, как и в get
    });    
    /*connection.query("INSERT INTO `twits` (`message`) VALUES (?)", [message], error => { //подключение к базе данных
        if (error) {
            console.error(error);
            return;  
        }
        response.redirect('/'); // перенаправление к запросу get
    })*/
})

sequelize.sync().then(() => { // говорим базе данных воссоздать таблицы если их нет, покажи сообщение если все норм
    User.upsert({ //можно было бы сделать create, но нам надо создать, а если создан - обновить логин, пасс и адм Up+Insert=upsert 
        'login' : process.env.TWISTER_ADMIN_LOGIN, // пишем эти значения в env
        'password' : process.env.TWISTER_ADMIN_PASSWORD,
        'admin' : true
    }).then(() => {
        app.listen(port, () => console.log(`Example app listening on port ${port}!`)); // запускаем сервер
    });
});
