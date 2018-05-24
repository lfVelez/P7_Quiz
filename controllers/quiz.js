const Sequelize = require("sequelize");
const {models} = require("../models");

// Autoload the quiz with id equals to :quizId
exports.load = (req, res, next, quizId) => {

    models.quiz.findById(quizId)
    .then(quiz => {
        if (quiz) {
            req.quiz = quiz;
            next();
        } else {
            throw new Error('There is no quiz with id=' + quizId);
        }
    })
    .catch(error => next(error));
};


// GET /quizzes
exports.index = (req, res, next) => {

    models.quiz.findAll()
    .then(quizzes => {
        res.render('quizzes/index.ejs', {quizzes});
    })
    .catch(error => next(error));
};


// GET /quizzes/:quizId
exports.show = (req, res, next) => {

    const {quiz} = req;

    res.render('quizzes/show', {quiz});
};


// GET /quizzes/new
exports.new = (req, res, next) => {

    const quiz = {
        question: "", 
        answer: ""
    };

    res.render('quizzes/new', {quiz});
};

// POST /quizzes/create
exports.create = (req, res, next) => {

    const {question, answer} = req.body;

    const quiz = models.quiz.build({
        question,
        answer
    });

    // Saves only the fields question and answer into the DDBB
    quiz.save({fields: ["question", "answer"]})
    .then(quiz => {
        req.flash('success', 'Quiz created successfully.');
        res.redirect('/quizzes/' + quiz.id);
    })
    .catch(Sequelize.ValidationError, error => {
        req.flash('error', 'There are errors in the form:');
        error.errors.forEach(({message}) => req.flash('error', message));
        res.render('quizzes/new', {quiz});
    })
    .catch(error => {
        req.flash('error', 'Error creating a new Quiz: ' + error.message);
        next(error);
    });
};


// GET /quizzes/:quizId/edit
exports.edit = (req, res, next) => {

    const {quiz} = req;

    res.render('quizzes/edit', {quiz});
};


// PUT /quizzes/:quizId
exports.update = (req, res, next) => {

    const {quiz, body} = req;

    quiz.question = body.question;
    quiz.answer = body.answer;

    quiz.save({fields: ["question", "answer"]})
    .then(quiz => {
        req.flash('success', 'Quiz edited successfully.');
        res.redirect('/quizzes/' + quiz.id);
    })
    .catch(Sequelize.ValidationError, error => {
        req.flash('error', 'There are errors in the form:');
        error.errors.forEach(({message}) => req.flash('error', message));
        res.render('quizzes/edit', {quiz});
    })
    .catch(error => {
        req.flash('error', 'Error editing the Quiz: ' + error.message);
        next(error);
    });
};


// DELETE /quizzes/:quizId
exports.destroy = (req, res, next) => {

    req.quiz.destroy()
    .then(() => {
        req.flash('success', 'Quiz deleted successfully.');
        res.redirect('/quizzes');
    })
    .catch(error => {
        req.flash('error', 'Error deleting the Quiz: ' + error.message);
        next(error);
    });
};


// GET /quizzes/:quizId/play
exports.play = (req, res, next) => {

    const {quiz, query} = req;

    const answer = query.answer || '';

    res.render('quizzes/play', {
        quiz,
        answer
    });
};


// GET /quizzes/:quizId/check
exports.check = (req, res, next) => {

    const {quiz, query} = req;

    const answer = query.answer || "";
    const result = answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim();

    res.render('quizzes/result', {
        quiz,
        result,
        answer
    });
}

// GET/quizzes/randomplay
    exports.randomplay = (req,res,next) => {
        if(req.session.randomplay == undefined){
            req.session.randomplay = [];
        }
        /*
        Uso whereOpt para que no me devuelva la misma pregunta que se encuentre en req.session.randomplay
         */
        const whereOpt = {"id": {[Sequelize.Op.notIn]:req.session.randomplay}};

           return models.quiz.count({where:whereOpt}) // where busca en la base de datos|whereOPt busca el id no repetido
            .then(count => {
                let aux = Math.floor(Math.random()*count); // me va a dar los id
                return models.quiz.findAll({where:whereOpt,
                offset : aux, // busco en el array desde 0 hasta offset
                    limit :1 // me devuelve una solo

                })
                    .then(quizzes => {
                        return quizzes[0]; // Quiero la primera que cumpla las condiciones anteriores
                    });
            })
               .then(quiz => {
                   if(quiz === undefined){
                       console.log("Se han contestado todas las preguntas");
                       let score = req.session.randomplay.length; // Numero de preguntas acertadas
                       req.session.randomplay.length= [];
                       res.render('quizzes/random_nomore',{
                           score
                       });
                   } else{
                       console.log("Quiz " + quiz);
                       let score = req.session.randomplay.length; // Numero de preguntas acertadas
                       res.render('quizzes/random_play',{
                           quiz,score
                       });
                   }

               })
            .catch(error => {
                req.flash('error','error getting a random Quiz: ' + error.message);
                next(error);
            })
 };

exports.randomcheck = (req,res,next) => {
    const {quiz, query} = req;

    const answer = query.answer || ""; // Lo busco en el query porque es un GET, si fuese un post tendria que buscarlo con body
    const result = answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim();
    if(result){
        if(req.session.randomplay.indexOf(quiz.id)===-1){ // Si no esta en el almacen local, lo mete
            req.session.randomplay.push(quiz.id);
        }
        let score = req.session.randomplay.length; // En este punto se ha contestado bien la pregunta
        res.render('quizzes/random_result',{score,result,answer});
    }else{
        let score = req.session.randomplay.length; // En este punto se ha contestado bien la pregunta
        req.session.randomplay=[];
        res.render('quizzes/random_result',{score,result,answer});
    }
};

