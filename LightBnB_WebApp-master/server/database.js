const properties = require('./json/properties.json');
const users = require('./json/users.json');
const pg = require('pg');
const Pool = pg.Pool;

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME
};

const pool = new Pool(config);

pool.connect(() => {
  console.log('connected to the database');
});


/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool.query(`
  SELECT * FROM users
    WHERE email = $1;
    `, [email])
    .then(res => res.rows[0])
    .catch(err => console.log(err));
};
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool.query(`
  SELECT * FROM users
    WHERE id = $1;
    `, [id])
    .then(res => res.rows[0])
    .catch(err => console.log(err));
};
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function(user) {
  const queryString = `
  INSERT INTO users (name, email, password)
  VALUES ($1, $2, $3)
  RETURNING *;
  `;
  const values = [user.name, user.email, user.password];
  return pool.query(queryString, values)
    .then(res => res.rows[0])
    .catch(err => console.log(err));
};
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  return pool.query(`
  SELECT reservations.*, properties.*, AVG(property_reviews.rating) AS average_rating
  FROM reservations
    JOIN properties ON reservations.property_id = properties.id
    JOIN property_reviews ON reservations.property_id = properties.id
  WHERE reservations.end_date > now()
  ::date AND reservations.guest_id = 1
  GROUP BY reservations.id, properties.id
  ORDER BY start_date
  LIMIT 10;
  `)
    .then(res => res.rows)
    .catch(err => console.log(err));
};
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */

const getAllProperties = function(options, limit = 10) {
  // 1
  const queryParams = [];
  // 2
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  // 3
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    if (queryParams.length - 1 !== 0) {
      queryString += `AND city LIKE $${queryParams.length} `;
    } else {
      queryString += `WHERE city LIKE $${queryParams.length} `;
    }
  }

  if (options.owner_id) {
    queryParams.push(options.owner_id);
    if (queryParams.length - 1 !== 0) {
      queryString += `AND owner_id = $${queryParams.length} `;
    } else {
      queryString += `WHERE owner_id = $${queryParams.length} `;
    }
  }

  if (options.minimum_price_per_night || options.maximum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 1);
    queryParams.push(options.maximum_price_per_night * 1);
    if (queryParams.length - 2 !== 0) {
      queryString += `AND cost_per_night <= $${queryParams.length
        } AND cost_per_night >= $${queryParams.length - 1} `;
    } else {
      queryString += `WHERE cost_per_night <= $${queryParams.length
        } AND cost_per_night >= $${queryParams.length - 1} `;
    }
  }

  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    queryString += `GROUP BY properties.id 
    HAVING avg(property_reviews.rating) >= $${queryParams.length} `;
  }

  queryParams.push(limit);
  if (options.minimum_rating) {
    queryString += `
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
    `;
  } else {
    queryString += `
    GROUP BY properties.id
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
    `;
  }


  // 5
  console.log(queryString, queryParams);

  // 6
  return pool.query(queryString, queryParams)
    .then(res => res.rows);
};
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const queryString = `
  INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, street, city, province, post_code, country, parking_spaces, number_of_bathrooms, number_of_bedrooms)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  RETURNING *;
  `;
  const values = [
    `${property.owner_id}`,
    `${property.title}`,
    `${property.description}`,
    `${property.thumbnail_photo_url}`,
    `${property.cover_photo_url}`,
    `${property.cost_per_night}`,
    `${property.street}`,
    `${property.city}`,
    `${property.provence}`,
    `${property.post_code}`,
    `${property.country}`,
    `${property.parking_spaces}`,
    `${property.number_of_bathrooms}`,
    `${property.number_of_bedrooms}`
  ];
  return pool.query(queryString, values)
    .then(res => res.rows[0])
    .catch(err => console.log(err));
};
exports.addProperty = addProperty;