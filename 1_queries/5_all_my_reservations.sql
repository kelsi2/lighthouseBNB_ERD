SELECT reservations.*, properties.*, AVG(property_reviews.rating) AS average_rating
FROM reservations
  JOIN properties ON reservations.property_id = properties.id
  JOIN property_reviews ON reservations.property_id = properties.id
WHERE reservations.end_date< now()
::date AND reservations.guest_id = 1
GROUP BY reservations.id, properties.id
ORDER BY start_date
LIMIT 10;