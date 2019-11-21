function type(d) {
  d.t4val = +d.t4val;
  d.t5val = +d.t5val;
  return d;
}

function roundedRectPath(x, y, w, h, r, tl, tr, bl, br) {
    var retval;
    retval  = "M" + (x + r) + "," + y;
    retval += "h" + (w - 2*r);
    if (tr) { retval += "a" + r + "," + r + " 0 0 1 " + r + "," + r; }
    else { retval += "h" + r; retval += "v" + r; }
    retval += "v" + (h - 2*r);
    if (br) { retval += "a" + r + "," + r + " 0 0 1 " + -r + "," + r; }
    else { retval += "v" + r; retval += "h" + -r; }
    retval += "h" + (2*r - w);
    if (bl) { retval += "a" + r + "," + r + " 0 0 1 " + -r + "," + -r; }
    else { retval += "h" + -r; retval += "v" + -r; }
    retval += "v" + (2*r - h);
    if (tl) { retval += "a" + r + "," + r + " 0 0 1 " + r + "," + -r; }
    else { retval += "v" + -r; retval += "h" + r; }
    retval += "z";
    return retval;
}

function createCharts(lang="en") {
  var maxWidth = 845;
  var barWidth = 78;
  var barMaxHeight = 160;

  var spaceBetweenTests = 42;
  var spaceBetweenBars = 16;

  var animationDuration = 1000;

  var y = d3.scale.linear()
      .range([barMaxHeight, 0]);

  var chart = d3.select(".chart");
  var format = d3.format(".2s");

  d3.csv("/transmit/stats.csv", type, function(error, data) {

    // Sorry about this layout math.
    var barCount = (data.length * 2);
    var barWidth = (maxWidth - (spaceBetweenBars * data.length) - (spaceBetweenTests * (data.length - 1))) / barCount;
    barWidth -= (spaceBetweenTests/2)/4;

    // Create the container div
    var chartAndLegend = chart.selectAll("div.chart-and-legend")
        .data(data)
      .enter()
      .append("div")
        .attr("class", "chart-and-legend")

    // Create the chart container
    var bar = chartAndLegend
      .append("svg")
        .attr("class", "single-chart")
        .attr("width", barWidth*2 + spaceBetweenBars)
        .attr("height", barMaxHeight);

    var firstBar = bar.append('g');

    // The first (left, old t4) bar
    firstBar.append("g").append("path")
    .attr("class", "t4")
    .attr("d", function(d) {
      y.domain([0, d.t4val]);
      return roundedRectPath(0, barMaxHeight, barWidth, barMaxHeight - y(d.t4val), 10, true, true, false, false);
    })

    // The label for that bar
    firstBar.append("g").append("text")
      .attr("class", "t4")
        .attr("x", barWidth/2)
        .attr("y", barMaxHeight)
        .style("opacity", 0)
        .text(0);


    // Animate the bar
    firstBar.selectAll("path").transition().ease("bounce").delay(500).duration(animationDuration)
      .attr("d", function(d) {
        y.domain([0, d.t4val]);
        return roundedRectPath(0, y(d.t4val), barWidth, barMaxHeight - y(d.t4val), 10, true, true, false, false);
      });

    // Animate the text
    firstBar.selectAll("text").transition().ease("bounce").delay(500).duration(animationDuration)
        .attr("y", barMaxHeight/2)
        .style("opacity", 1)
        .tween("text", function(d) {
          var currentValue = +this.textContent;
          var i = d3.interpolate(currentValue, d.t4val);
          return function(t) {
            d3.select(this).text(format(i(t)) + "s");
          };
        });

    var secondBar = bar.append('g');

    // The second (right, new t5) bar
    secondBar.append("g").append("path")
      .attr("d", function(d) {
        y.domain([0, d.t4val]);
        return roundedRectPath(spaceBetweenBars, barMaxHeight, barWidth, barMaxHeight - y(d.t5val), 10, true, true, false, false);
      })
      .attr("class", "t5")
      .attr("transform", "translate(" + barWidth+spaceBetweenBars + ",0)");

    // The label for that bar
    secondBar.append("text")
      .attr("x", barWidth + spaceBetweenBars + barWidth/2)
      .attr("dy", "-6px")
      .attr("y", barMaxHeight)
      .attr("class", "t5")
      .style("opacity", 0)
      .text(0);

      // Animate the bar
      secondBar.selectAll("path").transition().ease("bounce").delay(500).duration(animationDuration)
        .attr("d", function(d) {
          y.domain([0, d.t4val]);
          return roundedRectPath(spaceBetweenBars, y(d.t5val), barWidth, barMaxHeight - y(d.t5val), 10, true, true, false, false);
        });

      // Animate the text
      secondBar.selectAll("text").transition().ease("bounce").delay(500).duration(animationDuration)
          .attr("y", function(d) {
            y.domain([0, d.t4val]);
            return y(d.t5val);
          })
          .style("opacity", 1)
          .tween("text", function(d) {
            var currentValue = +this.textContent;
            var i = d3.interpolate(currentValue, d.t5val);
            return function(t) {
              d3.select(this).text(format(i(t)) + "s");
            };
          });


    // The legend for this chart
    
    if (lang === "en") {
    chartAndLegend.append("div")
      .attr("class", "chart-legend")
      .html(function(d) {
        return "<div class=\"chart-details\">up to <strong>" +
        d.multiplier + "&times; Faster<em>!</em></strong><small>" +
        d.description + "</small></div>";
      });
    } else if (lang === "jp") {
    chartAndLegend.append("div")
      .attr("class", "chart-legend")
      .html(function(d) {
        return "<div class=\"chart-details\">最大 <strong>" +
        d.multiplier + "&times; 速！</strong><small>" +
        d.description_jp + "</small></div>";
      });
    }

  });
}
