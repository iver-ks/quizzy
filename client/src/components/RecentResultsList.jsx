function formatResultDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function RecentResultsList({ title = 'Последние результаты', results = [] }) {
  const hasResults = results.length > 0;

  return (
    <section className="profile-results-card">
      <div className="profile-section-head">
        <h2>{title}</h2>
      </div>

      {hasResults ? (
        <div className="profile-results-list">
          {results.map((item, index) => (
            <article key={`${item.quizTitle}-${item.date}-${index}`} className="profile-result-item">
              <div className="profile-result-copy">
                <strong>{item.quizTitle}</strong>
                <span>{formatResultDate(item.date)}</span>
              </div>
              <div className="profile-result-meta">
                <strong>{new Intl.NumberFormat('ru-RU').format(item.score)} очков</strong>
                <span>
                  #{item.place} из {item.participantsCount}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="profile-results-empty">
          <p>Ничего не найдено</p>
        </div>
      )}
    </section>
  );
}

export default RecentResultsList;
