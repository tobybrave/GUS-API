const formatDate = (moment) => {
  const pad = (n) => (n >= 10 ? n : `0${n}`);

  const date = moment || new Date();
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();

  return `${year}-${pad(month + 1)}-${pad(day)}`;
};

module.exports = formatDate;
