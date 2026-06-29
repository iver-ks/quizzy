function ProfileStatsGrid({ stats }) {
  const items = [
    { value: stats?.completedQuizzes ?? 0, label: 'Пройдено квизов' },
    { value: stats?.createdQuizzes ?? 0, label: 'Создано квизов' },
    { value: stats?.bestScore ?? 0, label: 'Лучший результат' },
    { value: stats?.averageScore ?? 0, label: 'Средний балл' },
  ];

  return (
    <div className="profile-stats-grid">
      {items.map((item) => (
        <article key={item.label} className="profile-stat-card">
          <strong>{new Intl.NumberFormat('ru-RU').format(item.value)}</strong>
          <span>{item.label}</span>
        </article>
      ))}
    </div>
  );
}

export default ProfileStatsGrid;
