import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the canvas and gate palette', () => {
    render(<App />)
    expect(screen.getByTitle('Add AND gate')).toBeInTheDocument()
    expect(screen.getByTitle('Undo (Ctrl+Z)')).toBeDisabled()
  })
})
