'use strict';

// prettier-ignore

const form = document.querySelector('.form');

const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const deleteAll = document.querySelector('.btn--delete');

class App {
  #workouts = [];
  #workoutMarkers = [];
  #map;
  #mapZoomLvl = 13;
  #mapEvent;
  editCoords = [];

  constructor() {
    // methods
    this._getPosition();
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    containerWorkouts.addEventListener('click', this.deleteWorkout.bind(this));
    deleteAll.addEventListener('click', this.reset);
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Failed');
        }
      );
    }
  }

  _loadMap(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLvl);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    this.#map.on('click', this._showForm.bind(this));
    this._getLocalStorage();
  }

  _showForm(mapEvt) {
    form.classList.remove('hidden');
    inputDistance.focus();
    this.#mapEvent = mapEvt;
  }

  _hideForm() {
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.parentElement.classList.toggle('form__row--hidden');
    inputCadence.parentElement.classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();
    const markerCoords = [this.#mapEvent.latlng.lat, this.#mapEvent.latlng.lng];

    // validators
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const positiveInputs = (...inputs) => inputs.every(inp => inp > 0);

    // get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const err = 'Inputs have to be positive numbers';
    let workout;

    // behaviour based on workout type
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // data validation
      if (
        !validInputs(distance, duration, cadence) ||
        !positiveInputs(distance, duration, cadence)
      )
        return alert(err);
      // if (!Number.isFinite(duration)) return alert(err);

      workout = new Running(distance, duration, markerCoords, type, cadence);
    }
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      // data validation
      if (
        !validInputs(distance, duration, elevation) ||
        !positiveInputs(distance, duration)
      )
        return alert(err);

      workout = new Cycling(distance, duration, markerCoords, type, elevation);
    }
    this.#workouts.push(workout);

    markerCoords, inputDistance.value, inputDuration.value, inputCadence.value;
    // clear input fields

    this._renderWorkoutMarker(workout);
    this._renderWorkoutItem(workout);
    this._hideForm();
    this._setLocalStorage();
    this.showDeleteBtn();
  }

  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords).addTo(this.#map);

    marker
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkoutItem(workout) {
    const html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <div class="workout__title">${
      workout.description
    }<div class="workout__menu"><button class="del" data-id=${
      workout.id
    }>x</button></div></div>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>
    
    ${
      workout.type === 'running'
        ? `<div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
    </li>`
        : `<div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">m</span>
      </div>
    </li>`
    }
    `;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutItem = e.target.closest('.workout');
    if (!workoutItem) return;

    const workout = this.#workouts.find(
      workout => workout.id === workoutItem.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLvl, {
      animate: true,
      pan: { duration: 1 },
    });

    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const userData = JSON.parse(localStorage.getItem('workouts'));

    if (!userData) return;

    this.#workouts = userData;
    this.#workouts.forEach(workout => {
      this._renderWorkoutItem(workout);
      this._renderWorkoutMarker(workout);
      this.showDeleteBtn();
    });
  }

  reset() {
    if (confirm('Are you sure you want to delete all workouts?')) {
      localStorage.removeItem('workouts');
      location.reload();
      deleteAll.classList.add('btn--hidden');
    }
  }

  showDeleteBtn() {
    deleteAll.classList.remove('btn--hidden');
  }

  deleteWorkout(e) {
    const delBtn = e.target.closest('.del');
    if (!delBtn) return;

    const indexOfItemToDelete = this.#workouts.findIndex(
      workout => workout.id === delBtn.dataset.id
    );

    if (confirm('Sure about this?')) {
      delBtn.closest('.workout').remove();
      this.#workouts.splice(indexOfItemToDelete, 1);
      this._setLocalStorage();
      location.reload();
    }
  }
}

const app = new App();

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(distance, duration, coords, type) {
    this.distance = distance;
    this.duration = duration;
    this.coords = coords;
    this.type = type;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase() + this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  constructor(distance, duration, coords, type, cadence) {
    super(distance, duration, coords, type);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  constructor(distance, duration, coords, type, elevationGain) {
    super(distance, duration, coords, type);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = (60 * this.distance) / this.duration;
    return this.speed;
  }
}
