type Props = {
  message: string
  onRetry: () => void
}

export default function ErrorState({ message, onRetry }: Props) {
  return (
    <div className="error-state" role="alert">
      <div>
        <strong>We couldn’t load the wind data.</strong>
        <p>{message}</p>
      </div>
      <button className="button button-secondary" onClick={onRetry} type="button">
        Try again
      </button>
    </div>
  )
}
