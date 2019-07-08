function loadTwits () { // грузим твиты теперь здесь, а не в index.ejs

    $.getJSON('/', (twits) => {
        const twitList = $ ('#twits'); twitList.empty(); //вместо innerHTML = '';
        for(let twit of twits) {
            //twitList.append($(`<li>${twit.message}</li>`));  // вместо appendChild и создания твитов
            twitList.append($('<li>').text(twit.message));     //провели sanitize по отношению к строке выше 
        }   
    }).fail(() => {
        console.error('Failed to liad twits, trying to load twits in 5 sec.'); setTimeout(loadTwits, 5000);
    });   
};

function postTwit(event) {                          //здесь могут передать event аргумент, его надо принять
    $.post('/', $(this).serialize(), () => {          // в this - здесь form, seriazile сам работает с кодировкой, автоматически
        loadTwits(); $(this).find('textarea[name="message"]').val(''); //ставим пустое значение в textarea после отправки твита
    }).fail(() => {
        console.error('Server error, failed to post the twit.');
    });

    event.preventDefault();                         //нельзя автоматически отправлять инфу на серв, перезагружать страницы и тд.
};

$ (() => {      // если страница прогрузилась, вместо вызова ready()
    const twitList = $('#twits'); //если  есть твитлист, грузим твиты
    if(twitList.length) loadTwits();       
                 
    const twitForm = $('#twitForm'); //если есть твитформ, при submit вызываем posttwit и грузим твиты
    if (twitForm.length)  twitForm.submit(postTwit); 

});

