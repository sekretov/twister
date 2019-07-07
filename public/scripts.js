function ready(fn) {
    if (document.attachEvent ? document.readyState === "complete" : document.readyState !== "loading"){ // проверка если
      fn();                                                                                             // используем IE9+
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
};

function loadTwits () { // грузим твиты теперь здесь, а не в index.ejs
    const twitList = document.getElementById('twits'); // назначили id="twist" в ul, приняли
    if (!twitList) { // если не страница index.js и там нем twitList, выходим
        return;
    }

    const request = new XMLHttpRequest();
    const sendAsyncroniusly = true; //асинхронный или нет
    request.open('GET', '/', sendAsyncroniusly); // ставим параменты нашего get запроса
    request.setRequestHeader('Accept', 'application/json'); // получаем в хедере на получение json с сервера 
    request.onload = function() {                               // говорим какую функцию вызвать когда загружается.
        if (request.status >= 200 && request.status < 400) {    // если статут 200 или 300+, то есть без ошибок
            // Success!
            const twits = JSON.parse(request.responseText);      // результат с сервера доступен в этой переменной, но json
            if (twits) {
                twitList.innerHTML = '';

                for(let twit of twits) {
                    const twitListItem = document.createElement('li');             //создаем элемент li
                    twitListItem.appendChild(document.createTextNode(twit.message));    //вносим создаем текстовое поле как в ejs с твитами             
                    twitList.appendChild(twitListItem);                             //делаем li ребенком ul, вносим li в ul
                }   
            }
        } else {
            // We reached our target server, but it returned an error
            handleLoadtwitsError('The server failed, trying to load twits in 5 sec.') //если твит не прогрузился, вызываем функцию, которая сообщит об ошибке в консоль и попробулет еще раз прогрузить твиты через 5 сек
        }
    };

    request.onerror = function() { // если другие ошибки, не добрались до сервера
        // There was a connection error of some sort
        handleLoadtwitsError('connection failure, trying to load twits in 5 sec.')
    };
    request.send();
};

function handleLoadtwitsError(msg) {
    console.error(msg)
    setTimeout(loadTwits, 5000);
};

function postTwit(event) {                          //здесь могут передать event аргумент, его надо принять
    const request = new XMLHttpRequest();
    const sendAsyncroniusly = true; //асинхронный или нет
    request.open('POST', '/', sendAsyncroniusly); //меняем на POST
    //request.setRequestHeader('Accept', 'application/json'); // уже нужнно было бы без redirect
    request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded'); //добавили header для кодировки для body-parser
    request.onload = function() {                               // говорим какую функцию вызвать когда загружается.
        if (request.status >= 200 && request.status < 400) {    // если статут 200 или 300+, то есть без ошибок
            loadTwits()                                         // вместо redirect тут просто вызываем функцию get запроса загрузки твитов
        } else {
            // We reached our target server, but it returned an error
           console.error('Server error, failed to post the twit.') //если твит не прогрузился, вызываем функцию, которая сообщит об ошибке в консоль и попробулет еще раз прогрузить твиты через 5 сек
        }
    };

    request.onerror = function() { // если другие ошибки, не добрались до сервера
        // There was a connection error of some sort
        console.error('Failed to connect to post the twit.')
    };

    const twitFormElements = event.target.elements; // здесь массив элементов указывающих на форму во время события
    const twitTextArea = twitFormElements[0];       // забираем нужный элемент где будет текст сообщения
    //const postBody = `${twitTextArea.name}=${twitTextArea.value}`;  // забираем тело body сообщения. Так передется в urlencoded
    const postBody = `${encodeURIComponent(twitTextArea.name)}=${encodeURIComponent(twitTextArea.value)}`; // решаем проблему с кодировкой
    
    request.send(postBody); //передаем закодированный postBody
    twitTextArea.value = '';
  
    event.preventDefault();                         //нельзя автоматически отправлять инфу на серв, перезагружать страницы и тд.
}

ready(() => {      // если страница прогрузилась,
    loadTwits();        // грузим твиты

    const twitForm = document.getElementById('twitForm');
    twitForm.addEventListener('submit', postTwit);              //при subit вызываем postTwit
});

