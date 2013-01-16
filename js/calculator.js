window.calculator = initCalculator({
  groupName:            document.querySelector("input[name=groupName]"),
  numSpeakers:          document.querySelector("input[name=numSpeakers]"),
  populationPercentage: document.querySelector("input[name=populationPercentage]"),
  chart:                document.querySelector(".chart"),
  notes:                document.querySelector(".notes")
});

function initCalculator(self) {
  var groupName = self.groupName;
  var numSpeakers = self.numSpeakers;
  var populationPercentage = self.populationPercentage;
  var chart = self.chart;
  var notes = self.notes;

  var notesTemplate = Handlebars.compile(document.getElementById("template-notes").innerHTML);
  var chartWidth = chart.offsetWidth;

  setupEvents();
  recalculate();

  return self;

  function setupEvents() {
    groupName.addEventListener("change", updateNotes, false);
    groupName.addEventListener("keydown", zeroTimeout(updateNotes), false);
    numSpeakers.addEventListener("change", recalculate, false);
    numSpeakers.addEventListener("keydown", zeroTimeout(recalculate), false);
    populationPercentage.addEventListener("change", recalculate, false);
    populationPercentage.addEventListener("keydown", zeroTimeout(recalculate), false);
    window.addEventListener("resize", resize, false);
  }

  function recalculate() {
    if (!numSpeakers.validity.valid || !populationPercentage.validity.valid)
      return;

    var populationFraction = populationPercentage.valueAsNumber/100;

    self.expectedNumber = numSpeakers.valueAsNumber * populationFraction;
    self.data = poisson(numSpeakers.valueAsNumber, populationFraction);

    redraw();
    updateNotes();
  }

  function redraw() {
    renderChart(self.data, self.expectedNumber, chart);
  }

  function resize() {
    if (chart.offsetWidth !== chartWidth) {
      chartWidth = chart.offsetWidth;
      redraw();
    }
  }

  function updateNotes() {
    var templateData = getNotesTemplateData(self.data, self.expectedNumber);
    templateData.groupName = groupName.value;
    notes.innerHTML = notesTemplate(templateData);
  }
}

function zeroTimeout(callback) {
  return function() {
    window.setTimeout(callback, 0);
  }
}

function getDimensions(chart) {
  var margin = {top: 20, right: 20, bottom: 30, left: 40};

  return {
    margin: margin,
    width: chart.offsetWidth - margin.left - margin.right,
    height: chart.offsetHeight - margin.top - margin.bottom
  };
}

function initSVG(chart) {
  var dim = getDimensions(chart);
  var svg = d3.select(chart).select("svg > g");

  if (svg.empty()) {
    svg = d3.select(chart)
            .append("svg")
            .append("g")
            .attr("transform", "translate(" + dim.margin.left + "," + dim.margin.top + ")");

    svg.append("g")
       .attr("class", "x axis")
       .attr("transform", "translate(0," + dim.height + ")")

    svg.append("g")
       .attr("class", "y axis")
  }

  return svg;
}

function renderChart(data, expectedNumber, chart) {
  var dim = getDimensions(chart);
  var barWidth = dim.width / data.length;

  var x = d3.scale.ordinal()
            .rangeRoundBands([0, dim.width], .1);

  var y = d3.scale.linear()
            .domain([0, d3.max(data)])
            .range([dim.height, 0]);

  var xAxis = d3.svg.axis()
                .scale(x)
                .orient("bottom");

  var maxTickWidth = 20;

  if (data.length * maxTickWidth > dim.width) {
    var linearX = d3.scale.linear()
                    .domain([0, data.length])
                    .range([0, dim.width]);

    xAxis.scale(linearX);
  }

  var yAxis = d3.svg.axis()
                .scale(y)
                .ticks(2)
                .orient("left");

  x.domain(data.map(function(d, i) { return i }));

  var svg = initSVG(chart);

  svg.attr("width",  dim.width + dim.margin.left + dim.margin.right)
     .attr("height", dim.height + dim.margin.top + dim.margin.bottom);

  svg.select(".x.axis").call(xAxis);
  svg.select(".y.axis").call(yAxis);

  var bar = svg.selectAll(".bar").data(data)

  bar.enter()
    .append("g")
    .append("rect")
      .attr("y", dim.height)
      .attr("height", 0);

  bar.exit().remove();

  bar.attr("class", function(d, i) {
       if (i < expectedNumber) return "bar under-representation";
       if (i > expectedNumber) return "bar over-representation";
       return "bar";
     });

  bar.select("rect")
     .attr("x", function(d, i) { return x(i) })
     .attr("width", x.rangeBand())
   .transition()
     .attr("y", y)
     .attr("height", function(d) { return dim.height - y(d) });
}

function getNotesTemplateData(data, expectedNumber) {
  var over       = data.filter(function(p, i) { return i > expectedNumber }).reduce(function(a, b) { return a+b }, 0);
  var under      = data.filter(function(p, i) { return i < expectedNumber }).reduce(function(a, b) { return a+b }, 0);
  var none       = data[0];

  var showOverVsNone = (none > 0) && (over > 0);
  var overVsNone     = showOverVsNone && (over/none).toPrecision(2);

  return {
    overPercentage:  toPercentage(over),
    underPercentage: toPercentage(under),
    nonePercentage:  toPercentage(none),
    showOverVsNone:  showOverVsNone,
    overVsNone:      overVsNone
  };

  function toPercentage(p) {
    return (p * 100).toPrecision(2);
  }
}

function poisson(n, p) {
  var probabilities = [];

  for (var i=0; i<=n; i++) {
    probabilities.push(fact(n) / (fact(i)*fact(n-i)) * Math.pow(p, i) * Math.pow(1-p, n-i));
  }

  return probabilities;
}

function fact(n) {
  if (n < 2) return 1;
  var out = n;
  while (--n) out *= n;
  return out;
}
