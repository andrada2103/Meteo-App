const API_GEOLOCATION_URL = "https://geocoding-api.open-meteo.com/v1/search";
const API_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";


const cityForm = document.querySelector("#cityForm");

const locationBtn = document.querySelector("#location-btn");

const warmestDayBtn = document.querySelector("#warmestDay-btn");

cityForm.addEventListener("submit", onCityFormSubmit);
locationBtn.addEventListener("click", onLocationBtnClick)

async function onCityFormSubmit(event){
    event.preventDefault();

    clearContent()

    const cityInput=cityForm.querySelector("#city");
    const cityName = cityInput.value.trim();

    if(!cityName){
        displayError("Introduceti numele orasului");
        return;
    }

    displayLoading();

    try{
        const cityCoordinates = await getCityCoordinates(cityName);

        if(cityCoordinates === null){
         hideLoading();
         displayError(`Nu s au putut prelua coordonatele orasului ${cityName}`);
         return;
        }
        
        const weatherResponse= await getWeather(cityCoordinates.lat, cityCoordinates.long);
     
        const weatherData = parseApiData(weatherResponse);
        console.log(weatherData);
        hideLoading();
        displayWeather(cityName, weatherData);
/*         setWeatherBackground(weatherData); // Aici apelezi setWeatherBackground()
 */
     
        cityInput.value = "";
    } catch(error){
        hideLoading();
        displayError(`A aparut o eroare ${error}`);
    }

}

function onLocationBtnClick() {
    clearContent();
  
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        displayLoading();
  
        try {
          const weatherResponse = await getWeather(
            position.coords.latitude,
            position.coords.longitude
          );
  
          const weatherData = parseApiData(weatherResponse);
  
          hideLoading();
  
          displayWeather('locatia ta', weatherData);
        } catch (error) {
          hideLoading();
          displayError(`A aparut o eroare ${error}`);
        }
      });
    } else {
      displayError('API-ul pentru geolocation nu este disponibil');
    }
  }

async function getCityCoordinates(cityName){
    const apiUrl = new URL(API_GEOLOCATION_URL);
    apiUrl.searchParams.append("name", cityName);
    apiUrl.searchParams.append("count", 1);
    
    console.log(apiUrl.toString())

    const response = await fetch(apiUrl.toString())

    const data = await response.json();

    if(!data || !data.hasOwnProperty("results")){
        return null;
    }

    const result = data.results[0];

    return {lat: result.latitude, long: result.longitude};

}


async function getWeather(lat, long){
    
    const apiUrl = new URL(API_FORECAST_URL);
    apiUrl.searchParams.append("latitude", lat);
    apiUrl.searchParams.append("longitude", long);
    apiUrl.searchParams.append("timezone", "auto");
    apiUrl.searchParams.append("hourly", "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m")

    console.log(apiUrl.toString());

    const response = await fetch(apiUrl.toString())

    const data = await response.json();
    return data;
}

function parseApiData(data){
    const numberOfItems = data.hourly.time.length;
    let currentWeather = null;
    const forecasts = [];

    const currentDateTime = new Date();
    for(let i = 0; i<numberOfItems; i++){
        const itemDateTime = new Date(data.hourly.time[i]);

        const isToday = currentDateTime.toDateString() === itemDateTime.toDateString();

        const isCurrentHour = currentDateTime.getHours() === itemDateTime.getHours();

        if(isToday && isCurrentHour){
            currentWeather = {
                date: data.hourly.time[i],
                temp: data.hourly.temperature_2m[i],
                wind: data.hourly.wind_speed_10m[i],
                humidity: data.hourly.relative_humidity_2m[i],
                code: data.hourly.weather_code[i]
            }
        } else if(isCurrentHour){
            forecasts.push({
                date: data.hourly.time[i],
                temp: data.hourly.temperature_2m[i],
                wind: data.hourly.wind_speed_10m[i],
                humidity: data.hourly.relative_humidity_2m[i],
                code: data.hourly.weather_code[i]
            })
        }
    }

    return {
        current: currentWeather,
        forecasts: forecasts
    }
}


function displayWeather(cityName, weather, ){
    const pageContent = document.querySelector(".page-content");

    pageContent.append(createTodayWeatherSection(cityName, weather.current))
    pageContent.append(createForecastWeatherSection(cityName, weather.forecasts))

}

function createTodayWeatherSection(cityName, currentWeather){
    const todaySection=document.createElement('div');

    const title=document.createElement('h2');
    title.classList.add("section-title")
    title.innerText = `Vremea in ${cityName} astazi`;
    title.style.color = 'white'

    todaySection.append(title);

    const weatherPanel = createWeatherPanel(currentWeather, true);
    todaySection.append(weatherPanel);
    return todaySection;  
}

function createForecastWeatherSection(cityName, forecast){
    const forecastSection=document.createElement('div');

    const title=document.createElement('h2');
    title.classList.add("section-title")
    title.innerText = `Vremea in ${cityName} in urmatoarele zile`;
    title.style.color = 'white'

    forecastSection.append(title);

    const weatherItems=document.createElement('div')
    weatherItems.classList.add("weather-items");

    forecastSection.append(weatherItems);

    for(let i = 0; i< forecast.length; i++){
        const weatherPanel = createWeatherPanel(forecast[i], false);
        weatherItems.append(weatherPanel);
    
    }
    return forecastSection;

}

function createWeatherPanel(weather, isToday){
    const  weatherPanel = document.createElement('div');
    const panelClass = isToday ? "today" : "forecast";

    weatherPanel.classList.add("weather-panel", panelClass);

    const weatherDetails = document.createElement('div');
    weatherDetails.classList.add("weather-details");
    weatherPanel.append(weatherDetails);


    const currentHour = new Date().getHours();
    const isNight = currentHour >= 20 || currentHour <= 6;

    const weatherIcon = getIcon(weather.code, isNight)
    const imageContainer = document.createElement('div');
    const icon = document.createElement('img');
    icon.src = weatherIcon;

    imageContainer.append(icon);
    weatherPanel.append(imageContainer);

    weatherPanel.append(weatherDetails);

    const date = document.createElement('p');
    date.classList.add("date");
    date.innerText = weather.date.replace("T", ", ");

    const temp = document.createElement('p');
    temp.innerText = `Temperatura: ${weather.temp} °C`;

    const wind = document.createElement('p');
    wind.innerText = `Vant: ${weather.wind} km/h`

    const humidity = document.createElement('p');
    humidity.innerText = `Umiditatea ${weather.humidity} %`

    weatherDetails.append(date, temp, wind, humidity);

    return weatherPanel;

}

function getIcon(code, isNight){
    switch(code){
        case 0: return isNight ? "night.svg" : "sunny.svg"
        case 1:
        case 2:
        case 3:
            return isNight ? " cloudy-night.svg" : "cloudy-day.svg" ;
        case 45:  
        case 48: 
        case 51:
        case 53:
        case 55:
        case 56:
        case 57:
            return "cloudy.svg"
        case 61: 
        case 63: 
        case 65: 
        case 66: 
        case 67: 
        case 80: 
        case 81: 
        case 82: 
            return "rainy.svg"
        case 71:
        case 73:
        case 75:
        case 77:
        case 85:
        case 86: 
            return "snowy.svg"
        case 95:
        case 96:
        case 99:
            return "thunder.svg"
        default: return isNight ? "night.svg" : "sunny.svg"
    }
   
}

function clearContent(){
    const pageContent = document.querySelector(".page-content");
    pageContent.innerHTML = "";
}

function displayLoading(){
    const pageContent = document.querySelector(".page-content");
    const loading = document.createElement('p');
    loading.setAttribute("id", "loading");
    loading.innerText = "Se incarca datele despre vreme";
    pageContent.append(loading);
}

function hideLoading(){
    const loading = document.querySelector("#loading");
    if(loading){
        loading.remove();
    }
}

function displayError(message){
    const pageContent = document.querySelector(".page-content");
    const alert = document.createElement("div");
    alert.classList.add("alert-error");
    alert.innerText = message;
    pageContent.append(alert);
}

/* 
async function getWarmestDay(cityName) {
    try {
        const weatherData = await fetchWeatherData(cityName);
        if (!weatherData || !weatherData.forecast || weatherData.forecast.forecastday.length === 0) {
            throw new Error('Nu s-au putut obține datele pentru orașul specificat.');
        }

        let warmestDay = weatherData.forecast.forecastday[0];
        for (let i = 1; i < weatherData.forecast.forecastday.length; i++) {
            if (weatherData.forecast.forecastday[i].day.avgtemp_c > warmestDay.day.avgtemp_c) {
                warmestDay = weatherData.forecast.forecastday[i];
            }
        }

        return warmestDay;
    } catch (error) {
        throw new Error(`A apărut o eroare: ${error.message}`);
    }
} */

function isNight(){
    const currentHour = new Date().getHours();
    return currentHour >= 20 || currentHour <=6;
}

function isRainy(weather_code) {
    const rainyCodes = [61, 63, 65, 66, 67, 80, 81, 82];
    return rainyCodes.includes(weather_code);
}

function isSnowy(weather_code) {
    const snowyCodes = [71, 73, 75, 77, 85, 86];
    return snowyCodes.includes(weather_code);
}

function isCloudy(weather_code){
    const cloudyCodes = [45,  48, 51, 55, 53, 56, 57, 1, 2, 3, 5, 6, 7,];
    return cloudyCodes.includes(weather_code);
}

function isThunder(weather_code){
    const thunderCodes = [95, 96, 99];
    return thunderCodes.includes(weather_code);
}

function isSunny(weather_code){
    const sunnyCodes=[0,1,2,3];
    return sunnyCodes.includes(weather_code)
}


/* const is_night = isNight();
const weather_code = getIcon(weather_code);

switch (weather_code) {
    case "night.svg":
        document.body.style.backgroundImage = "url('https://i.pinimg.com/originals/52/a3/05/52a30508c1aaae473ed48ae8f1d876d9.jpg')";
        break;
    case "cloudy-night.svg":
    case "cloudy-day.svg":
        document.body.style.backgroundImage = "url('https://www.thoughtco.com/thmb/J3Rgj51HG6lQKDL8k-PJgtdf2bI=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/GettyImages-528903279-599d1549aad52b001107054d.jpg')";
        break;
    case "rainy.svg":
        document.body.style.backgroundImage = "url('https://static.vecteezy.com/system/resources/previews/029/772/287/large_2x/human-daily-life-on-rainy-day-enjoying-rainfall-and-happy-life-lively-rainy-season-concept-generative-ai-free-photo.jpeg')";
        break;
    case "snowy.svg":
        document.body.style.backgroundImage = "url('https://img.freepik.com/free-photo/minimalist-photorealistic-road_23-2150953065.jpg')";
        break;
    case "thunder.svg":
        document.body.style.backgroundImage = "url('https://www.metoffice.gov.uk/binaries/content/gallery/metofficegovuk/hero-images/weather/thunder--lightning/lightning-strike-over-lake.jpeg')";
        break;
    case "sunny.svg":
        document.body.style.backgroundImage = "url('https://images.unsplash.com/photo-1476067897447-d0c5df27b5df?q=80&w=1000&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8d2F5fGVufDB8fDB8fHww')";
        break;
    default:
        document.body.style.backgroundImage = "url('https://images.unsplash.com/photo-1476067897447-d0c5df27b5df?q=80&w=1000&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8d2F5fGVufDB8fDB8fHww')";
       
}
 */

//    document.body.style.backgroundImage = "url('https://images.unsplash.com/photo-1476067897447-d0c5df27b5df?q=80&w=1000&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8d2F5fGVufDB8fDB8fHww')";


if(isNight()){
    document.body.style.backgroundImage = "url('https://i.pinimg.com/originals/52/a3/05/52a30508c1aaae473ed48ae8f1d876d9.jpg')";

} else {
    document.body.style.backgroundImage = "url('https://images.unsplash.com/photo-1476067897447-d0c5df27b5df?q=80&w=1000&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8d2F5fGVufDB8fDB8fHww')";

}