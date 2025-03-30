<?php

function DisplayCharts() {

}

?>
<script src="js/charts.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
<script src="https://cdn.jsdelivr.net/npm/echarts/dist/echarts.min.js"></script>
<link rel="stylesheet" href="/css/charts.css?c=<?php echo ALLSKY_VERSION; ?>" />

<div id="allsky-charts-sidebar" class="panel-group">
  <div id="allsky-charts-sidebar-title">
    <i class="fa fa-bar-chart"></i> Available Graphs
  </div>

  <!-- Basic Charts Category -->
  <div class="panel panel-default chart-category">
    <div class="panel-heading">
      <h4 class="panel-title">
        <a class="collapsed" data-toggle="collapse" href="#category-basic">
          📊 Basic Charts
        </a>
      </h4>
    </div>
    <div id="category-basic" class="panel-collapse collapse">
      <div class="panel-body">
        <div class="allsky-charts-chart-menu-item" data-type="line" draggable="true">
          <i class="fa fa-line-chart"></i> Line Chart
        </div>
        <div class="allsky-charts-chart-menu-item" data-type="bar" draggable="true">
          <i class="fa fa-bar-chart"></i> Bar Chart
        </div>
      </div>
    </div>
  </div>

  <!-- Environmental Category -->
  <div class="panel panel-default chart-category">
    <div class="panel-heading">
      <h4 class="panel-title">
        <a class="collapsed" data-toggle="collapse" href="#category-env">
          🌡️ Environmental
        </a>
      </h4>
    </div>
    <div id="category-env" class="panel-collapse collapse">
      <div class="panel-body">
        <div class="allsky-charts-chart-menu-item" data-type="temp" draggable="true">
          <i class="fa fa-thermometer-full"></i> Temperature
        </div>
      </div>
    </div>
  </div>

</div>

  <nav class="navbar navbar-default allsky-charts-navbar">              
      <div class="collapse navbar-collapse" id="oe-module-editor-navbar">
          <ul class="nav navbar-nav">
              <li>
                  <div class="btn btn-lg navbar-btn" id="allsky-charts-show-available" data-toggle="tooltip" data-container="body" data-placement="top" title="Show available charts"><i class="fa-solid fa-chart-line"></i></div>
              </li>                          
              <li>
                  <div class="btn btn-lg navbar-btn" id="allsky-charts-lock" data-toggle="tooltip" data-placement="top" data-container="body" title="lock/unlock drag and drop"><i class="fa-solid fa-lock"></i></div>
              </li>
              <li>
                  <div class="btn btn-lg navbar-btn" id="allsky-charts-clear" data-toggle="tooltip" data-placement="top" data-container="body" title="Delete all charts"><i class="fa-solid fa-trash-can"></i></div>
              </li>
          </ul>                            
      </div>
</nav>


  <div id="allsky-charts-main"></div>

  <script>

  </script>