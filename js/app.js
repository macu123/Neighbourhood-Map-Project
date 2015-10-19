var map;
var infowindow;
var chart;
var chartOption;

//Model for very venue retrieved from foursquare
VenueModel = function(data) {
  var self = this;
  self.name = data.venue.name || "N/A";
  self.contact = data.venue.contact.formattedPhone || "N/A";
  self.address = data.venue.location.formattedAddress[0] || "N/A";
  self.category = data.venue.categories[0].name || "N/A";
  self.verified = data.venue.verified || "N/A";
  self.rating = data.venue.rating || "N/A";
  //every venue has a marker associated with it
  self.marker = new google.maps.Marker({
    position: new google.maps.LatLng(
    data.venue.location.lat,
    data.venue.location.lng
    ),
    icon: data.venue.categories[0].icon.prefix + "bg_44" + data.venue.categories[0].icon.suffix,
    animation: google.maps.Animation.DROP,
    selected: ko.observable(false)
  });

  self.marker.selected.subscribe(function(newValue) {
    if (newValue) {
      map.setCenter(self.marker.getPosition());
      //set zoom level to 13 when the current zoom level is less than 13
      if (map.getZoom() < 13) {
        map.setZoom(13);
      }

      self.marker.setAnimation(google.maps.Animation.BOUNCE);
      setTimeout(function() {
        self.marker.selected(false);
      }, 2000);

      infowindow.setContent(self.marker.contentHtml);
      infowindow.open(map, self.marker);
    }
    else {
      self.marker.setAnimation(null);
    }

  });

  //Add a marker to the map
  self.addMarkerToMap = function() {
    self.marker.setMap(map);
  };

  //Remove a marker from the map
  self.removeMarkerFromMap = function() {
    self.marker.setMap(null);
  };

  //Extend bounds for the venue model
  self.extendBounds = function(bounds) {
    bounds.extend(this.marker.getPosition());
  };

  self.addCategory = function(categories) {
    if(categories.hasOwnProperty(self.category) === false) {
      categories[self.category] = 1;
    }
    else {
      categories[self.category] += 1;
    }

  };
};

//Model for all the venues, which is a array of venue models
function VenuesModel() {
  var self = this;
  //Observable indicating if the screen is loading screen
  self.loadingScreen = ko.observable(true);
  //Observable indicating if it's filter or search in terms of functionality
  self.boxFunction = ko.observable();
  //Observable indicating if search button is disable or not
  self.buttonDisable = ko.pureComputed(function() {
    return self.boxFunction() !== 'search';
  });
  //Observable indicating if ajax call fails or not
  self.ajax_failed = ko.observable(false);
  //Observable for the length of filteredvenuesModel
  self.num_of_venueModel = ko.pureComputed(function() {
    return self.filteredvenuesModel().length;
  });
  //Observable to store filter keyword
  self.keyword = ko.observable("");
  //ObservableArray to store all VenueModel
  self.venuesModel = ko.observableArray();
  //ObservableArray to store filtered VenuesModel
  self.filteredvenuesModel = ko.observableArray();
  //Computed Observable to indicate which part to display
  self.display_state = ko.pureComputed(function() {
    if(self.ajax_failed() === true) {
      return 0;
    }
    else if(self.venuesModel().length < 1) {
      return 1;
    }
    else {
      return 2;
    }
  });
  //execute filter the list view functionality whenever search input field changes
  self.keyword.subscribe(function(newValue) {
    if (self.boxFunction() !== 'filter') {
      return;
    }

    var filtered_array;
    //trim search keyword
    var keyword_filter = newValue.trim();
    // if search input field is empty
    if (keyword_filter === '') {
      filtered_array = self.venuesModel();
    }
    else {
      filtered_array = self.venuesModel().filter(function(vm) {
          return (vm.name.toLowerCase().indexOf(keyword_filter.toLowerCase()) !== -1);
        });
    }

    self.filteredvenuesModel(filtered_array);
  });
  // execute show/hide markers whenever the filteredvenuesModel changes
  self.filteredvenuesModel.subscribe(function(change) {
    for (var i=0, len=change.length; i < len; i++) {
      if (change[i].status === 'deleted') {
        change[i].value.removeMarkerFromMap();
      }
      else if (change[i].status === 'added') {
        change[i].value.addMarkerToMap();
      }
    }
    //return if no places in the list view
    if (self.filteredvenuesModel().length === 0) {
      return;
    }

    //adjust the map bounds accordingly
    //redraw category chart accordingly
    var bounds = new google.maps.LatLngBounds();
    var categories = {};
    self.filteredvenuesModel().forEach(function(vm) {
      vm.extendBounds(bounds);
      vm.addCategory(categories);
    });
    map.fitBounds(bounds);
    self.createPieChart(categories);

  }, null, 'arrayChange');

  //request popular venue models from FOURSQAURE
  self.addvenuesModel = function() {
    self.loadingScreen(true);
    //set limit 20 for number of venue models
    var four_square_baseUrl = "https://api.foursquare.com/v2/venues/explore?" +
    "client_id=2XMLIEZFYZSTKFVOSAL5JQFQLQNDNMYGXWGGPWXUSDXQCK4L&" + 
    "client_secret=ZKSE15LDLRYU31YZA2WRL2UYQLDGWFBIPUPTLRH3ITWCEZFL&" +
    "v=20150920&" + 
    "radius=5000&" + 
    "limit=20&";
    //get current map center when request
    var ll = map.getCenter().toUrlValue();
    //get query from input when request
    var query = self.keyword();
    var urlToRequest = four_square_baseUrl + "ll=" + ll + "&query=" + query;

    //make ajax call
    $.getJSON(urlToRequest, function(data) {
      self.ajax_failed(false);
      var venues = data.response.groups[0].items;
      if(self.checkError(venues) === false) {
        alert(
          "There is no result available now.\nPlease try to search a different term!"
          );
        return;
      }

      for(var i=0, length = venues.length; i < length; i++) {
        var venueModel = new VenueModel(venues[i]);
        //get information window content for every venue model
        ko.applyBindings(venueModel, $("#infoWindow")[0]);
        venueModel.marker.contentHtml = $("#infoWindow").html();
        //remove the binding
        ko.cleanNode($("#infoWindow")[0]);
        self.venuesModel.push(venueModel);
        self.filteredvenuesModel.push(venueModel);
        //add click event listener for every marker
        google.maps.event.addListener(venueModel.marker, 'click', function() {
          this.selected(true);
        });
      }

    //not show the list if the ajax call fails
    }).error(function() {
      self.ajax_failed(true);
      alert(
        "Cannot reach to the  server!\nPlease try it later!"
        );
    });

    self.loadingScreen(false);
  };

  //Remove all venue models from the array and remove their markers from the map
  self.removevenuesModel = function() {
    self.venuesModel.removeAll();
    self.filteredvenuesModel.removeAll();
  };

  //Update the array of venue models if search button is clicked
  self.updatevenuesModel = function() {
    if (self.buttonDisable() === true) {
      return;
    }

    self.removevenuesModel();
    self.addvenuesModel();
  };

  //Check if there are errors from the response from foursquare
  self.checkError = function(data) {
    return data.length >= 1;
  };

  self.createPieChart = function(categories) {
    var dataTable = new google.visualization.DataTable();
    //Declare columns
    dataTable.addColumn('string', 'Category');
    dataTable.addColumn('number', 'Total number');
    
    $.each(categories, function(propertyName, valueOfProperty) {
      var row = [propertyName, valueOfProperty];
      dataTable.addRow(row);
    });

    chart.draw(dataTable, chartOption);
  };

}

//Initialization
function initialize() {
  chart = new google.visualization.PieChart($("#myPieChart")[0]);
  chartOption = {
    chartArea: {
      left: 0,
      top: 0,
      width: '100%',
      height: '100%'
    },
    legend: {
      position: 'right'
    },
    width: 500,
    height: 500,
    is3D: true
  };

  var mapOptions = {
  	zoom: 13,
    disableDefaultUI: true,
    scaleControl: true
  };

  map = new google.maps.Map($("#map-canvas")[0], mapOptions);
  infowindow = new google.maps.InfoWindow({content: ""});

  //Bootstrap popover
  $(".setting").popover({
    title: "Location Setting",
    content: "<input class='loc_input' type='text' placeholder='Location like Toronto'>",
    html: true,
    placement: "bottom"
  });

  //Bootstrap popover event handler
  $(".setting").on('shown.bs.popover', function() {
    var loc_input = $(".loc_input")[0];
    //Google map autocomplete
    var autocompleteOption = {
      types: ['geocode']
    };
    var autocomplete = new google.maps.places.Autocomplete(
      loc_input,
      autocompleteOption
    );
    //Google map autocomplete event handler
    google.maps.event.addListener(autocomplete, 'place_changed', function() {
      var place = autocomplete.getPlace();
      //No geometry
      if(!place.geometry) {
        alert("Cannot locate this place!\nPlease try it later!");
        return;
      }
      //Have geometry
      //If have viewport
      if(place.geometry.viewport) {
        map.fitBounds(place.geometry.viewport);
      //If have no viewport
      }
      else {
        map.setCenter(place.geometry.location);
        map.setZoom(13);
      }
      
    });
  });

  //listButton collapse
  $(".listButton").click(function() {
    $("#collapseOne").toggleClass("active");
  });

  var venuesModel = new VenuesModel();
  ko.applyBindings(venuesModel, $(".full-screen")[0]);
  // Try W3C Geolocation (Preferred)
  //Autodetect user location
  navigator.geolocation.getCurrentPosition(
    function(position) {
      var initialLocation = new google.maps.LatLng(
        position.coords.latitude,
        position.coords.longitude
      );

      map.setCenter(initialLocation);
      venuesModel.addvenuesModel();
    },
    function() {
      // Browser doesn't support Geolocation
      map.setCenter(new google.maps.LatLng(43.2633, -79.9189));
      venuesModel.addvenuesModel();
    },
    {timeout:5000}
  );
  
}