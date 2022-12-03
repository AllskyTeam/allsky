"use strict";
class IMAGEDATA {

  #starmeteorChart = null;
  #exposuregain = null;
  #charts = [];

  constructor() {

  }

  updateStarmeteorChart(name, data) {
    this.#charts[name].data.labels = data.time;
    this.#charts[name].data.datasets[0].data = data.stars;
    this.#charts[name].data.datasets[1].data = data.meteors;
    this.#charts[name].images = data.images;
    this.#charts[name].thumbnails = data.thumbnails;
    this.#charts[name].update();
  }

  updateExposureGainChart(name, data) {
    this.#charts[name].data.labels = data.time;
    this.#charts[name].data.datasets[0].data = data.exposure;
    this.#charts[name].data.datasets[1].data = data.gain;
    this.#charts[name].images = data.images;
    this.#charts[name].thumbnails = data.thumbnails;
    this.#charts[name].update();
  }

  updateSkyStateChart(name, data) {
    this.#charts[name].data.labels = data.hours;
    this.#charts[name].data.datasets[0].data = data.percentageclear;
    this.#charts[name].update();
  }

  setupCharts() {
  }

  createStarsMeteorsChart(name, element) {
    const config = {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Stars',
            yAxisID: 'yA',            
            data: [],
            borderColor: '#FFBA08',
            backgroundColor: 'black',
            pointRadius: 0,
            borderWidth: 1,
            tension: 0.6            
          },
          {
            label: 'Meteors',
            yAxisID: 'yB',            
            data: [],
            borderColor: '#3F88C5',
            backgroundColor: 'black',
            pointRadius: 0,
            borderWidth: 1,
            tension: 0.6            
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          yA: {
            id: 'A',
            offset: true,
            position: 'left',
            scaleLabel: {
              display: true,
              labelString: 'Stars'
            }
          },
          yB: {
            id: 'B',
            position: 'right',
            scaleLabel: {
              display: true,
              labelString: 'Meteors'
            },
            ticks: {
              max: 2,
              min: -1,
              stepSize: 1
            }
          }
        },        
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Stars and Meteors'
          },
          zoom: {
            pan: {
              enabled: true,
              mode: 'x'          
            },
            zoom: {
              wheel: {
                enabled: true,
                modifierKey: 'shift'                
              },
              pinch: {
                enabled: true,
              },
              drag: {
                enabled: true,
              },
              mode: 'x'
            }            
          },
          tooltip: {
            enabled: false,
            position: 'nearest',
            external: this.#tooltipHandler
          }                    
        }
      },
    };

    this.#charts[name] = new Chart(
      document.getElementById(element),
      config
    );
  }

  createExposureGainChart(name, element) {
    const config = {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Exposure',
            yAxisID: 'yA',
            data: [],
            borderColor: '#D00000',
            pointRadius: 0,
            borderWidth: 1,
            tension: 0.6
          },
          {
            label: 'Gain',
            yAxisID: 'yB',
            data: [],
            borderColor: '#136F63',
            pointRadius: 0,
            borderWidth: 1,            
            tension: 0.6            
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          yA: {
            id: 'A',
            offset: true,
            position: 'left',
            scaleLabel: {
              display: true,
              labelString: 'Exposure'
            }
          },
          yB: {
            id: 'B',
            position: 'right',
            scaleLabel: {
              display: true,
              labelString: 'Gain'
            },
            ticks: {
              max: 2,
              min: -1,
              stepSize: 1
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Exposure and Gain'
          },
          zoom: {
            pan: {
              enabled: true,
              mode: 'x'          
            },
            zoom: {
              wheel: {
                enabled: true,
                modifierKey: 'shift'
              },
              pinch: {
                enabled: true,
              },
              drag: {
                enabled: true,
              },
              mode: 'x'
            }
          },
          tooltip: {
            enabled: false,
            position: 'nearest',
            external: this.#tooltipHandler
          }           
        },       
      }
    };

    this.#charts[name] = new Chart(
      document.getElementById(element),
      config
    );
  }

  createSkyStateChart(name, element) {
    const config = {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          {
            label: '% Clear',
            yAxisID: 'yA',            
            data: [],
            borderColor: '#FFBA08',
            backgroundColor: '#136F63',
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          yA: {
            id: 'A',
            min: 0,
            max: 100,
            offset: true,
            position: 'left',
            scaleLabel: {
              display: true,
              labelString: 'Stars'
            }
          }
        },        
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Sky State'
          }         
        }
      },
    };

    this.#charts[name] = new Chart(
      document.getElementById(element),
      config
    );
  }

  refreshCharts() {

    let active = $("ul#id-tabs li.active").attr('id');

    if (active == 'live') {
      $.ajax({
        url: 'includes/datautil.php?request=LiveData',
        type: 'GET',
        dataType: 'json',
        cache: false,
        context: this
      }).done((result) => {
        this.updateStarmeteorChart('livestars', result);
        this.updateExposureGainChart('liveexposure', result);
        this.updateSkyStateChart('liveskystate', result);
      });
    } else {
      let date = $("#id-historic-date option").filter(":selected").val();

      if (date != '') {
        $.ajax({
          url: 'includes/datautil.php?request=Data&date=' + date,
          type: 'GET',
          dataType: 'json',
          cache: false,
          context: this
        }).done((result) => {
          this.updateStarmeteorChart('historicstars', result);
          this.updateExposureGainChart('historicexposure', result);
          this.updateSkyStateChart('historicskystate', result);
        });
      }
    }

  }

  #tooltipHandler(context) {
    const {chart, tooltip} = context;

    let tooltipEl = chart.canvas.parentNode.querySelector('div');
  
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.style.background = 'rgba(0, 0, 0, 0.7)';
      tooltipEl.style.borderRadius = '3px';
      tooltipEl.style.color = 'white';
      tooltipEl.style.opacity = 1;
      tooltipEl.style.pointerEvents = 'none';
      tooltipEl.style.position = 'absolute';
      tooltipEl.style.transform = 'translate(-50%, 0)';
      tooltipEl.style.transition = 'all .1s ease';
  
      const table = document.createElement('table');
      table.style.margin = '0px';
  
      tooltipEl.appendChild(table);
      chart.canvas.parentNode.appendChild(tooltipEl);
    }

    // Hide if no tooltip
    if (tooltip.opacity === 0) {
      tooltipEl.style.opacity = 0;
      return;
    }

  // Set Text
  if (tooltip.body) {
    const titleLines = tooltip.title || [];
    const bodyLines = tooltip.body.map(b => b.lines);

    const tableHead = document.createElement('thead');

    titleLines.forEach(title => {
      const tr = document.createElement('tr');
      tr.style.borderWidth = 0;

      const th = document.createElement('th');
      th.style.borderWidth = 0;
      const text = document.createTextNode(title);

      th.appendChild(text);
      tr.appendChild(th);
      tableHead.appendChild(tr);
    });

    const tableBody = document.createElement('tbody');
    bodyLines.forEach((body, i) => {
      const colors = tooltip.labelColors[i];

      const span = document.createElement('span');
      span.style.background = colors.backgroundColor;
      span.style.borderColor = colors.borderColor;
      span.style.borderWidth = '2px';
      span.style.marginRight = '10px';
      span.style.height = '10px';
      span.style.width = '10px';
      span.style.display = 'inline-block';

      const tr = document.createElement('tr');
      tr.style.backgroundColor = 'inherit';
      tr.style.borderWidth = 0;

      const td = document.createElement('td');
      td.style.borderWidth = 0;

      const td1 = document.createElement('td');
      td1.style.borderWidth = 0;
      td1.style.padding ='10px';

      const text = document.createTextNode(body);

      const img = document.createElement('img');
      img.style.width = '150px';

      let index = tooltip.dataPoints[0].dataIndex;
      let imgSrc = chart.thumbnails[index];
      img.src = 'images/20221002/thumbnails/image-20221002225928.jpg';
      img.src = imgSrc;

      td.appendChild(span);
      td.appendChild(text);
      td1.appendChild(img);
      tr.appendChild(td);
      tr.appendChild(td1);
      tableBody.appendChild(tr);
    });

    const tableRoot = tooltipEl.querySelector('table');

    // Remove old children
    while (tableRoot.firstChild) {
      tableRoot.firstChild.remove();
    }

    // Add new children
    tableRoot.appendChild(tableHead);
    tableRoot.appendChild(tableBody);
  }

  const {offsetLeft: positionX, offsetTop: positionY} = chart.canvas;

  // Display, position, and set styles for font
  tooltipEl.style.opacity = 1;
  tooltipEl.style.left = positionX + tooltip.caretX + 'px';
  tooltipEl.style.top = positionY + tooltip.caretY + 'px';
  tooltipEl.style.font = tooltip.options.bodyFont.string;
  tooltipEl.style.padding = tooltip.options.padding + 'px ' + tooltip.options.padding + 'px';

  }

  
  buildUI() {
    this.setupCharts();

    this.createStarsMeteorsChart('livestars', 'id-live-stars');
    this.createExposureGainChart('liveexposure', 'id-live-exposure');
    this.createSkyStateChart('liveskystate', 'id-live-skystate');

    this.createStarsMeteorsChart('historicstars', 'id-historic-stars');
    this.createExposureGainChart('historicexposure', 'id-historic-exposure');
    this.createSkyStateChart('historicskystate', 'id-historic-skystate');

    $.ajax({
      url: 'includes/datautil.php?request=Startup',
      type: 'GET',
      dataType: 'json',
      cache: false,
      context: this
    }).done((result) => {

      $('#id-charts-wrapper').removeClass('hidden');

      if (!result.saverunning) {
        $('#id-warnings-nomodule').removeClass('hidden');
        $('#id-warnings-day').addClass('hidden');
        $('#id-live-charts').addClass('hidden');
        $('#id-tabs a[href="#id-historic"]').tab('show')
      } else {
        if (result.tod == 'day') {
          $('#id-warnings-nomodule').addClass('hidden');
          $('#id-warnings-day').removeClass('hidden');
          $('#id-live-charts').addClass('hidden');
          $('#id-tabs a[href="#id-historic"]').tab('show')
        } else {
          $('#id-warnings-nomodule').addClass('hidden');
          $('#id-warnings-day').addClass('hidden');
          $('#id-live-charts').removeClass('hidden');
        }
      }

      if (result.folders.length == 0) {
        $('#id-warnings-nodata').removeClass('hidden');
        $('#id-historic-charts').addClass('hidden');
      } else {
        $('#id-warnings-nodata').addClass('hidden');
        $('#id-historic-charts').removeClass('hidden');
      }

      $('#id-historic-date').empty();
      $('#id-historic-date').append(new Option('-- Select Date --', ''));
      for (let date in result.folders) {
        $('#id-historic-date').append(new Option(date, date));
      }

      $(document).on('change', '#id-historic-date', (e) => {
        this.refreshCharts();
      });

      $('a[data-toggle="tab"]').on('shown.bs.tab', (e) => {
        this.refreshCharts();
      })

      //$('#id-historic-date').val('20221011');
      this.refreshCharts();

    }).fail(function( jqXHR, textStatus, errorThrown ) {
      $('#id-charts-nodb').removeClass('hidden');
    });

  }

  run() {
    this.buildUI();
  }

}