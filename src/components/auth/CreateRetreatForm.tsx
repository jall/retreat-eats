import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateRetreat } from '../../lib/queries'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Card from '../ui/Card'

export default function CreateRetreatForm() {
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const navigate = useNavigate()
  const createRetreat = useCreateRetreat()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createRetreat.mutate(
      { name, start_date: startDate, end_date: endDate },
      {
        onSuccess: (retreat) => {
          navigate(`/retreat/${retreat.id}`)
        },
      }
    )
  }

  return (
    <Card title="Create a retreat">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Retreat name"
          placeholder="Summer cabin trip"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Start date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
          <Input
            label="End date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
        {createRetreat.isError && (
          <p className="text-sm text-red-600">
            {(createRetreat.error as Error).message}
          </p>
        )}
        <Button type="submit" disabled={createRetreat.isPending}>
          {createRetreat.isPending ? 'Creating...' : 'Create retreat'}
        </Button>
      </form>
    </Card>
  )
}
