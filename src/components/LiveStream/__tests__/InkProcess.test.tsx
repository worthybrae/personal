import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { InkProcess } from '../InkProcess'

afterEach(cleanup)
describe('drawing explanation', () => {
  it('lets visitors follow a stage and read its corresponding equation', () => {
    render(<InkProcess />)
    expect(screen.getByRole('img')).toHaveAccessibleName('Illustration of the light stage')
    fireEvent.click(screen.getByRole('button', { name: 'Memory' }))
    expect(screen.getByRole('img')).toHaveAccessibleName('Illustration of the memory stage')
    expect(screen.getByText(/memory = max/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Memory' })).toHaveAttribute('aria-pressed','true')
    fireEvent.click(screen.getByRole('button', { name: 'Flow' }))
    expect(screen.getByText(/sample_x =/)).toBeInTheDocument()
  })
  it('starts with still illustrations and gives an explicit animation toggle', () => {
    render(<InkProcess />)
    fireEvent.click(screen.getByRole('button', { name: 'Animate diagram' }))
    expect(screen.getByRole('button', { name: 'Pause animation' })).toHaveAttribute('aria-pressed','true')
    fireEvent.click(screen.getByRole('button', { name: 'Pause animation' }))
    expect(screen.getByRole('button', { name: 'Animate diagram' })).toHaveAttribute('aria-pressed','false')
  })
})
