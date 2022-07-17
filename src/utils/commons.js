const formatDateTime = (datetime) => {
  return new Date(datetime).toLocaleString("en");
};

export { formatDateTime };
