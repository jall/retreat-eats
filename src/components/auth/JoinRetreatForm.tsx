import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useJoinRetreat } from '../../lib/queries'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Card from '../ui/Card'

export default function JoinRetreatForm() {
  const [code, setCode] = useState('')
  const navigate = useNavigate()
  const joinRetreat = useJoinRetreat()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    joinRetreat.mutate(
      { join_code: code.trim().toUpperCase() },
      {
        onSuccess: (data) => {
          navigate(`/retreat/${data.retreat_id}`)
        },
      }
    )
  }

  return (
    <Card title="Join a retreat">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Join code"
          placeholder="ABC123"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        {joinRetreat.isError && (
          <p className="text-sm text-red-600">
            {(joinRetreat.error as Error).message}
          </p>
        )}
        <Button type="submit" disabled={joinRetreat.isPending}>
          {joinRetreat.isPending ? 'Joining...' : 'Join retreat'}
        </Button>
      </form>
    </Card>
  )
}
