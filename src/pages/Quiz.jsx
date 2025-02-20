import React, { useState, useEffect } from 'react';
import { MdOutlineLightMode, MdOutlineDarkMode } from "react-icons/md";
import { questions } from '../data/quizData';
import { openDB } from 'idb';

const Quiz = () => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [score, setScore] = useState(0);
    const [isQuizCompleted, setIsQuizCompleted] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [userInput, setUserInput] = useState("");
    const [attemptHistory, setAttemptHistory] = useState([]);
    const [isDark, setIsDark] = useState(() => JSON.parse(localStorage.getItem('theme')) || false);
    const [timeLeft, setTimeLeft] = useState(30);
    const [showFeedback, setShowFeedback] = useState(false);
    const [bestScore, setBestScore] = useState(() => JSON.parse(localStorage.getItem('bestScore')) || 0);

    useEffect(() => {
        if (timeLeft === 0) {
            handleNextQuestion();
        }

        const timer = setTimeout(() => {
            setTimeLeft(timeLeft - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [timeLeft]);

    useEffect(() => {
        const saveHistory = async () => {
            try {
                // Open the database and ensure 'quizHistory' exists
                const db = await openDB('QuizDB', 2, {
                    upgrade(db) {
                        if (!db.objectStoreNames.contains('quizHistory')) {
                            db.createObjectStore('quizHistory', { keyPath: 'id', autoIncrement: true });
                        }
                    }
                });

                // Ensure the object store exists before proceeding
                if (!db.objectStoreNames.contains('quizHistory')) {
                    console.error("Object store 'quizHistory' not found.");
                    return;
                }

                // Open a transaction in 'readwrite' mode and add data
                const tx = db.transaction('quizHistory', 'readwrite');
                const store = tx.objectStore('quizHistory');
                await store.add({
                    score,
                    attemptHistory,
                    timestamp: new Date().toISOString()
                });

                await tx.done;
            } catch (error) {
                console.error("IndexedDB Error:", error);
            }
        };

        if (isQuizCompleted) {
            saveHistory();
        }
    }, [isQuizCompleted]);

    const handleTheme = () => {
        const newTheme = !isDark;
        localStorage.setItem('theme', JSON.stringify(newTheme));
        setIsDark(newTheme);
    };

    const handleAnswerSelection = (option) => {
        setSelectedAnswer(option);
        setShowFeedback(true);

        const isCorrect = option.isCorrect;

        setAttemptHistory((prev) => [...prev, {
            question: questions[currentQuestion].question,
            selectedAnswer: option.text,
            isCorrect,
        }]);

        if (isCorrect) {
            setScore((prevScore) => prevScore + 1);
        }
    };

    const handleNextQuestion = () => {
        let isCorrect = false;

        if (!questions[currentQuestion].answers) {
            const correctAnswer = questions[currentQuestion].answer.toLowerCase().trim();
            isCorrect = userInput.toLowerCase().trim() === correctAnswer;

            setAttemptHistory((prev) => [...prev, {
                question: questions[currentQuestion].question,
                selectedAnswer: userInput,
                isCorrect,
            }]);

            if (isCorrect) {
                setScore((prevScore) => prevScore + 1);
            }
        }

        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
            setSelectedAnswer(null);
            setUserInput("");
            setTimeLeft(30);
            setShowFeedback(false);
        } else {
            setIsQuizCompleted(true);

            if (score > bestScore) {
                localStorage.setItem('bestScore', JSON.stringify(score));
                setBestScore(score);
            }
        }
    };

    const restartQuiz = () => {
        setCurrentQuestion(0);
        setScore(0);
        setIsQuizCompleted(false);
        setSelectedAnswer(null);
        setUserInput("");
        setAttemptHistory([]);
        setTimeLeft(30);
        setShowFeedback(false);
    };

    return (
        <div className={`${isDark ? 'dark bg-gray-900' : 'bg-gradient-to-r from-cyan-300 to-purple-400'} min-h-screen flex justify-center items-center p-4`}>
            <div className='absolute top-3 right-3 cursor-pointer text-2xl p-3 rounded-full text-gray-800 dark:text-gray-200' onClick={handleTheme}>
                {isDark ? <MdOutlineLightMode /> : <MdOutlineDarkMode />}
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 w-full max-w-2xl">
                <h1 className="text-3xl font-bold text-center mb-4 text-gray-900 dark:text-gray-200">Quiz App</h1>

                {!isQuizCompleted ? (
                    <>
                        <h2 className="text-2xl font-semibold text-center mb-4 text-gray-900 dark:text-gray-200">
                            Question {currentQuestion + 1} of {questions.length}
                        </h2>

                        <p className="text-lg font-medium mb-4 text-gray-700 dark:text-gray-300">
                            {questions[currentQuestion].question}
                        </p>

                        <div className="text-center mb-4">
                            <p className={`text-lg font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                                Time Left: {timeLeft} seconds
                            </p>
                        </div>

                        {questions[currentQuestion].answers ? (
                            <div className="grid gap-4">
                                {questions[currentQuestion].answers.map((option, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleAnswerSelection(option)}
                                        className={`cursor-pointer p-3 rounded-lg border transition-all 
                                        dark:text-gray-900 dark:bg-gray-100
                                        ${selectedAnswer
                                                ? option.isCorrect
                                                    ? 'bg-green-500 text-white dark:bg-green-600'
                                                    : (selectedAnswer.text === option.text
                                                        ? 'bg-red-500 text-white dark:bg-red-600'
                                                        : 'bg-gray-200')
                                                : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                                        disabled={selectedAnswer !== null}
                                    >
                                        {option.text}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <input
                                type="text"
                                className="w-full p-2 border rounded-lg mb-4 dark:bg-gray-700 dark:text-gray-200"
                                placeholder="Type your answer"
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                            />
                        )}

                        {showFeedback && (
                            <p className={`mt-4 text-lg font-semibold ${selectedAnswer?.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                                {selectedAnswer?.isCorrect ? "✅ Correct!" : "❌ Incorrect!"}
                            </p>
                        )}

                        <div className="flex justify-end mt-6">
                            <button
                                onClick={handleNextQuestion}
                                className="cursor-pointer bg-gradient-to-r from-cyan-300 to-purple-400 p-3 rounded-lg text-gray-100"
                                disabled={selectedAnswer === null && (!questions[currentQuestion].answers && userInput.trim() === "")}
                            >
                                Next
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="text-center">
                        <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-200">Quiz Completed!</h1>
                        <p className="text-lg mb-4 text-gray-700 dark:text-gray-300">Your Score: {score} / {questions.length}</p>

                        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg text-left">
                            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-200">📊 Scoreboard</h2>
                            <p className="text-lg text-gray-800 dark:text-gray-300">✅ Correct Answers: {score}</p>
                            <p className="text-lg text-gray-800 dark:text-gray-300">❌ Incorrect Answers: {questions.length - score}</p>
                            <p className="text-lg font-bold mt-2 text-gray-900 dark:text-gray-200">🏆 Best Score: {bestScore}</p>
                        </div>

                        <h2 className="text-2xl font-semibold mt-6 text-gray-900 dark:text-gray-200">Attempt History</h2>
                        <div className="text-left mt-4">
                            {attemptHistory.map((attempt, index) => (
                                <div key={index} className={`p-3 border rounded-lg mb-2 ${attempt.isCorrect ? 'bg-green-100 dark:bg-green-800' : 'bg-red-100 dark:bg-red-800'}`}>
                                    <p className="font-medium text-gray-900 dark:text-gray-200">{index + 1}. {attempt.question}</p>
                                    <p className="text-gray-700 dark:text-gray-300">
                                        <strong>Your Answer:</strong> {attempt.selectedAnswer} {attempt.isCorrect ? '✅' : '❌'}
                                    </p>
                                    <p className="text-gray-700 dark:text-gray-300">
                                        <strong>{attempt.isCorrect ? 'Correct' : 'Incorrect'}</strong>
                                    </p>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={restartQuiz}
                            className="cursor-pointer bg-gradient-to-r from-cyan-300 to-purple-400 p-3 rounded-lg text-gray-100 mt-6"
                        >
                            Restart Quiz
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

};

export default Quiz;