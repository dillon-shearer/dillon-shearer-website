// app/components/snake-game.tsx
'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'

const GRID_SIZE = 20
const INITIAL_SNAKE = [{ x: 10, y: 10 }]
const INITIAL_FOOD = { x: 15, y: 15 }
const INITIAL_DIRECTION = { x: 0, y: 0 } // Start stationary

interface Position {
  x: number
  y: number
}

interface SnakeGameProps {
  isOpen: boolean
  onClose: () => void
}

const SnakeGame: React.FC<SnakeGameProps> = ({ isOpen, onClose }) => {
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE)
  const [food, setFood] = useState<Position>(INITIAL_FOOD)
  const [direction, setDirection] = useState<Position>(INITIAL_DIRECTION)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  
  // Use ref to track the current direction to prevent rapid direction changes
  const currentDirectionRef = useRef<Position>(INITIAL_DIRECTION)
  const lastDirectionChangeRef = useRef<number>(0)

  const generateFood = useCallback((): Position => {
    let newFood: Position
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      }
    } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y))
    return newFood
  }, [snake])

  const resetGame = useCallback(() => {
    setSnake(INITIAL_SNAKE)
    setFood(INITIAL_FOOD)
    setDirection(INITIAL_DIRECTION)
    currentDirectionRef.current = INITIAL_DIRECTION
    setGameOver(false)
    setScore(0)
    setIsPlaying(false)
    setGameStarted(false)
    lastDirectionChangeRef.current = 0
  }, [])

  const moveSnake = useCallback(() => {
    if (gameOver || !isPlaying || !gameStarted) return

    setSnake(prevSnake => {
      const newSnake = [...prevSnake]
      const head = { ...newSnake[0] }
      
      // Use the current direction from ref
      const currentDir = currentDirectionRef.current
      head.x += currentDir.x
      head.y += currentDir.y

      // Check wall collision
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        setGameOver(true)
        setIsPlaying(false)
        return prevSnake
      }

      // Check self collision
      if (newSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
        setGameOver(true)
        setIsPlaying(false)
        return prevSnake
      }

      newSnake.unshift(head)

      // Check food collision
      if (head.x === food.x && head.y === food.y) {
        setScore(prev => prev + 10)
        setFood(generateFood())
      } else {
        newSnake.pop()
      }

      return newSnake
    })
  }, [direction, food, gameOver, isPlaying, gameStarted, generateFood])

  const changeDirection = useCallback((newDirection: Position) => {
    const now = Date.now()
    const timeSinceLastChange = now - lastDirectionChangeRef.current
    
    // Prevent rapid direction changes (minimum 100ms between changes)
    if (timeSinceLastChange < 100) return
    
    const current = currentDirectionRef.current
    
    // Prevent moving in opposite direction (would cause immediate self-collision)
    if (current.x !== 0 && newDirection.x === -current.x) return
    if (current.y !== 0 && newDirection.y === -current.y) return
    
    // Update direction
    currentDirectionRef.current = newDirection
    setDirection(newDirection)
    lastDirectionChangeRef.current = now
    
    // Start the game if it hasn't started yet
    if (!gameStarted && !gameOver) {
      setGameStarted(true)
      setIsPlaying(true)
    }
  }, [gameStarted, gameOver])

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    // Prevent default for game keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
      e.preventDefault()
    }
    
    if (gameOver) {
      if (e.key === ' ') {
        resetGame()
      }
      return
    }

    switch (e.key.toLowerCase()) {
      case 'arrowup':
      case 'w':
        changeDirection({ x: 0, y: -1 })
        break
      case 'arrowdown':
      case 's':
        changeDirection({ x: 0, y: 1 })
        break
      case 'arrowleft':
      case 'a':
        changeDirection({ x: -1, y: 0 })
        break
      case 'arrowright':
      case 'd':
        changeDirection({ x: 1, y: 0 })
        break
      case ' ':
        if (gameOver) {
          resetGame()
        }
        break
    }
  }, [gameOver, changeDirection, resetGame])

  useEffect(() => {
    if (!isOpen) {
      resetGame()
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => handleKeyPress(e)
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleKeyPress, resetGame])

  useEffect(() => {
    if (!isPlaying || gameOver || !gameStarted) return

    const gameInterval = setInterval(moveSnake, 120) // Slightly slower for better control
    return () => clearInterval(gameInterval)
  }, [moveSnake, isPlaying, gameOver, gameStarted])

  const startGame = () => {
    if (!gameStarted) {
      // Just enable controls, don't start moving yet
      setGameStarted(false) // Will be set to true when first direction is pressed
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Snake Game</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Score: {score}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Game Board */}
        <div className="mb-6 flex justify-center">
          <div 
            className="grid bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg p-2"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
              width: '320px',
              height: '320px'
            }}
          >
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
              const x = index % GRID_SIZE
              const y = Math.floor(index / GRID_SIZE)
              const isSnakeSegment = snake.some(segment => segment.x === x && segment.y === y)
              const isFood = food.x === x && food.y === y
              const isHead = snake[0]?.x === x && snake[0]?.y === y

              return (
                <div
                  key={index}
                  className={`
                    w-full h-full rounded-sm transition-colors duration-150
                    ${isSnakeSegment 
                      ? isHead 
                        ? 'bg-green-600 dark:bg-green-500' 
                        : 'bg-green-500 dark:bg-green-400'
                      : isFood 
                        ? 'bg-red-500 dark:bg-red-400' 
                        : 'bg-transparent'
                    }
                  `}
                />
              )
            })}
          </div>
        </div>

        {/* Game Status */}
        <div className="text-center mb-6">
          {!gameStarted && !gameOver && (
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-3">Press any arrow key or WASD to start!</p>
            </div>
          )}
          
          {gameStarted && isPlaying && !gameOver && (
            <p className="text-gray-600 dark:text-gray-400">Use WASD or arrow keys to control the snake!</p>
          )}
          
          {gameOver && (
            <div>
              <p className="text-red-600 dark:text-red-400 mb-3 font-semibold">Game Over!</p>
              <p className="text-gray-600 dark:text-gray-400 mb-3">Final Score: {score}</p>
              <button
                onClick={resetGame}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Play Again
              </button>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          <p>Use arrow keys or WASD to control the snake</p>
          <p>Eat the red food to grow and score points</p>
          <p>Don't hit the walls or yourself!</p>
        </div>
      </div>
    </div>
  )
}

const HiddenSnakeButton: React.FC = () => {
  const [isGameOpen, setIsGameOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window)
    }
    
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  // Don't render on mobile
  if (isMobile) return null

  return (
    <>
      {/* Hidden Floating Button */}
      <button
        onClick={() => setIsGameOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          fixed bottom-4 right-4 w-8 h-8 rounded-full transition-all duration-500 z-40
          ${isHovered 
            ? 'bg-green-500 dark:bg-green-600 shadow-lg scale-110 opacity-100' 
            : 'bg-gray-300 dark:bg-gray-700 shadow-sm opacity-5 hover:opacity-15'
          }
          border ${isHovered ? 'border-green-400 dark:border-green-500' : 'border-gray-400 dark:border-gray-600'}
          flex items-center justify-center
        `}
      >
        <span className={`transition-all duration-500 ${isHovered ? 'text-lg scale-125 opacity-100' : 'text-xs scale-75 opacity-30'}`}>
          {isHovered ? 'S' : '•'}
        </span>
      </button>

      {/* Snake Game Modal */}
      <SnakeGame 
        isOpen={isGameOpen} 
        onClose={() => setIsGameOpen(false)} 
      />
    </>
  )
}

export default HiddenSnakeButton