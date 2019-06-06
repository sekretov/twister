const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
//const mysql = require('mysql2'); этот require больше не нужен, заменили на sequelize, но mysql2 всегда надо устанавливать
const Sequelize = require('sequelize');
const bcrypt = require('bcrypt');
require('dotenv').config();

const port = process.env.TWISTER_PORT;

/*const connection = mysql.createConnection({ //подключили базу данных
    host: TWISTER_DB_HOST, //Поменяли все данные с помощью dotenv .env
    port: TWISTER_DB_PORT,
    username: TWISTER_DB_USER,
    password: TWISTER_DB_PASSWORD,	
    database: TWISTER_DB_NAME
});*/

const sequelize = new Sequelize({       //подключили sequelize вместо обычной mysql2. 
    host: process.env.TWISTER_DB_HOST,  //Поменяли все данные с помощью dotenv .env
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
        'unique'    : true              // в workbench unique index. Уникальный индекс нужен для логина, поэтому ниже делаем upsert    
    },
    'password' : {
        'type' : Sequelize.STRING,      // как и раньше, строка
        'allowNull' : false 
    },
    'admin' : {
        'type' : Sequelize.BOOLEAN,     // создаем админа, булевое значение
        'allowNull' : false,
        'defaultValue' : false          // по умолчанию пользователи не создаются админами, ставим это поле.
    }
});               

const Twit = sequelize.define('twit', {  // sequelize создала модель и может воссоздать таблицу в mysql при утере или переезде
    'message' : {                        //    
        'type' : Sequelize.STRING,       // чаще всего Sequelize.STRING даже если в workbench отличается.
        'allowNull' : false              // allowNull - галочка в NotNull в MySQL workbench.    
    }
});

User.hasMany(Twit);                     // Will add userId to Task model
Twit.belongsTo(User);                   // Will also add userId to Task model

const app = express();
app.set('view engine', 'ejs');          //запрос нашего ejs
app.use(bodyParser.urlencoded({ extended: false})); //запрос библиотеки body parser
app.use(express.static('public'));
app.use(session({
    secret: process.env.TWISTER_SESSION_SECRET, // секрет тоже храним в env, если получили доступ к куки со стороны клиента, могли что то делать с ним
    resave: false,
    saveUninitialized: true // информация для баз данных. Для нашей бд необязательно, но и не лишнее.
}));

app.get('/', (request, response) => {         //запрос на получение информации с сервена на ejs клиент и запрос с базы данных.
    Twit.findAll().then(results => {    //найти все твиты с константой const Twit, созданной выше
        response.render('index', { 'twits': results, 'session' : request.session }); // .render тоже метод express. Прочитай index.ejs, теперь отправляем еще и сессии в ejs
    }).catch(error => {                 // .catch это команда sequelize для ловли ошибок 
        console.error(error);
        response.status(500).end;       // .status и .end тоже метод express. ошибку нужную выбираем. statu покажет ошибку, если есть
    });                                 // end завершит запрос. Ошибка уйдет в браузер.
   
   
    /*connection.query('SELECT * FROM twits', (error, results) => {  // подключение к базе данных
            if (error) {
                console.error(error);
                return;
            }

            response.render('index', { 'twits': results });  // отправка снова к документу index.ejs, в results теперь все твиты    
    }); */                                                   // с базы данных там она переносится в twits и через перебор for of
});                                                          // и неупоряд. список <ul> <li> отображается значение `twits` 
                                                             // то есть каждого twit. А метод .message возвращает сам текст   

app.post('/', (request, response) => {    //запрос в поста ejs action post, в request сейчас хранится сообщение твита,
    //const message = request.body.message; // через body.message сообщение твита переводится в обьект и идет в message
    // Create a new user
    if(!request.session.authorized) {   //Но хакер может сделать post запрос и без браузера, надо выкинуть его на сервере, 
        console.error('Attempt to unauthorized tweet creation');           //выведя ошибку и добавив лог для нас
        response.status(401).end; // 
        
        return;
    }
    Twit.create({ 
        'message' : request.body.message,
        'userId' : request.session.userId
    }).then(() => { //Twit - константа. _ - эта переменная не нужна, мы ее оставим формально
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
});

app.get('/register', (request, response) => { // обращаемся к <a href="/register">Registration</a> в index.ejs
    //response.render('registration');   // команда Прочитай registration.ejs
    response.render('registration', {'session' : request.session}); // отправляем ошибку в registration.ejs, там создадим тег error
}); 

app.post('/register', (request, response) => { // запрос с action post обращаемся к /register и записываем инфу в request о логине и пароле
    const login = request.body.login;       // эту инфу и пишем в базу данных логин и ниже парольв стандартном методе body указаны
    const password = request.body.password;  //  ключ значения, обьекты .body с body-parser вместо текста persent encoding
    const passwordRepeat = request.body['password-repeat']; // body.password-repeat так писать нельзя
// также программа узнает что именно из обьектов логин, а что пароль по name в <input type="text" name="login" required> в registration.ejs 
    
    //todo login complexity check
    //todo password complexity check

    if (password !== passwordRepeat) { // пароли не совпадают - ошибка
        request.session.error = 'Password are not same, please try again'
        response.redirect('/register');
        //response.render('registration', {'error' : lastErrorMessage}); //переносим в get
        return; // после ошибки выходим из if. останавливем if.
    }

    User.create({  // пишем в const User в бд информацию ниже
        'login' : login,           
        'password' : bcrypt.hashSync(password, +process.env.TWISTER_PASSWORD_SALT_ROUND) // также хешируем перед внесением в бд      
    }).then(user => { // коллбэк пишем так
        request.session.authorized = true;  // если авторизовались выше, то true. Сразу залогиним его. Создали свой обьект - свойство
        request.session.login = login;      // используем в ejs чтобы отобразить его логин.
        request.session.userId = user.id;   // Чтобы ассоциировать id твитов и пользователей
        response.redirect('/'); // перенаправление к запросу get. Таким образом заменили connection.query mysql2 и здесь.
    }).catch(error => { // .catch это команда sequelize, для ловли ошибок, 
        //if (error instanceof SequelizeUniqueConstraintError) { //если error относится к типу SequelizeUniqueConstraintError
        //    request.session.error = 'A user with such name exists' // польз существует
        //    response.redirect('/register'); //переходим в окно регистрации
        //} else {
            console.error(error); // TODO Анализ ошибок, если проблема с нашей стороны, бд упала, то 500. Если все норм, но оформить приятную ошибку
            response.status(500).end; // такая же обработка ошибок, как и в get
        //}    
    }); 
});    

app.get('/login', (request, response) => { 
    response.render('login', {'session' : request.session});
}); 

app.post('/login', (request, response) => { // запрос с action post обращаемся к /register и записываем инфу в request о логине и пароле
    const login = request.body.login;       // эту инфу и пишем в базу данных логин и ниже парольв стандартном методе body указаны
    const password = request.body.password;  //  ключ значения, обьекты .body с body-parser вместо текста persent encoding

    User.findOne({  // найди в бд 1 пользователя
        'where' : { 'login' : login }, // где логин = логин который ввели             
    }).then(user => { //user пришло из бд как один из найденных из User, по введенному логину
        if (!user || !bcrypt.compareSync(password, user.password)) { // если логин не тот или пароль для этого логина не совпадает с введенным. проверка хешей с солью
            request.session.error = 'Failed to login. Wrong login or password.' // копируем ошибку с /register 
            response.redirect('/login');

            return; 
        }

        request.session.authorized = true; //залогинимся
        request.session.login = user.login;    
        request.session.userId = user.id;  // Чтобы ассоциировать id твитов и пользователей
        response.redirect('/'); // перейдем на главную
    }).catch(error => { 
            console.error(error); // TODO Анализ ошибок,
            response.status(500).end; 
        //}    
    }); 
}); 

app.get('/logout', (request, response) => { //при нажатии на logout запрос на выдачу нового ID и новой сессии в regenetate
    request.session.regenerate(() => {       
        response.redirect('/');             //и нас перенаправляет на главную страницу
    })
});

app.post('/twit/:id/delete', (request, response) => {
    const twitID = request.params['id'];
    User.destroy({
        where: {
          id: twitID
        }
      }).then(() => {
        response.redirect('/');
      });
});

sequelize.sync().then(() => { // говорим базе данных воссоздать таблицы если их нет, покажи сообщение если все норм
    User.upsert({ //можно было бы сделать create, но нам надо создать, а если создан - обновить логин, пасс и адм Up+Insert=upsert 
        'login' : process.env.TWISTER_ADMIN_LOGIN, // пишем эти значения в env и создаем аккаунт админа.
        'password' : bcrypt.hashSync(process.env.TWISTER_ADMIN_PASSWORD, +process.env.TWISTER_PASSWORD_SALT_ROUND), // захешировали пароль
        'admin' : true
    }).then(() => {
        app.listen(port, () => console.log(`Example app listening on port ${port}!`)); // запускаем сервер
    });
});
