<?php

function DisplayCharts() {

}

?>

  <link rel="stylesheet" href="https://unpkg.com/gridstack/dist/gridstack.min.css" />
  <script src="https://unpkg.com/gridstack/dist/gridstack-all.js"></script>
  <script src="https://code.highcharts.com/highcharts.js"></script>

  <script src="/js/charts.js"></script>

  <style>
    #as-charts-sidebar {
      width: 250px;
      padding: 10px;
      transition: width 0.3s;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      overflow: hidden;
    }

    #as-charts-sidebar.as-charts-collapsed {
      width: 50px;
      align-items: center;
    }

    #as-charts-toggleSidebar {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      margin-bottom: 10px;
      align-self: flex-start;
    }

    #as-charts-sidebar.as-charts-collapsed #as-charts-toggleSidebar {
      align-self: center;
    }

    .as-charts-chart-type {
      margin: 10px 0;
      padding: 10px;
      background: #ddd;
      cursor: grab;
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      border-radius: 5px;
    }

    .as-charts-chart-type i {
      width: 20px;
      text-align: center;
      font-size: 18px;
    }

    #as-charts-sidebar.as-charts-collapsed .as-charts-label {
      display: none;
    }

    #as-charts-sidebar.as-charts-collapsed .as-charts-chart-type {
      justify-content: center;
      padding: 10px;
      width: 100%;
    }

    .dark .as-charts-label, .dark .as-charts-chart-type {
        color: black;
    }

    #as-charts-main {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      grid-template-rows: repeat(3, 1fr);
      gap: 10px;
      padding: 10px;
      overflow-y: auto;
      height: 100vh;
    }

    .as-charts-grid-cell {
      border: 1px dashed #ccc;
      display: flex;
      align-items: stretch;
      justify-content: stretch;
    }

    .as-charts-chart-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .as-charts-chart-remove {
      position: absolute;
      background: none;
      top: 5px;
      right: 5px;
      color: black;
      border: none;
      border-radius: 50%;
      width: 25px;
      height: 25px;
      cursor: pointer;
      z-index: 10;
    }

    .as-charts-chart-refresh {
      position: absolute;
      background: none;
      top: 5px;
      right: 30px;
      color: black;
      border: none;
      border-radius: 50%;
      width: 25px;
      height: 25px;
      cursor: pointer;
      z-index: 10;
    }

    .dark .as-charts-chart-refresh {
      color: white;
    }


    .dark .as-charts-chart-remove {
      color: white;
    }

    .as-charts-chart-container {
      flex: 1;
      width: 100%;
      height: 100%;
    }
  </style>

<div style="display: flex">

  <div id="as-charts-sidebar">
    <button id="as-charts-toggleSidebar" title="Toggle Sidebar">
      <i class="fas fa-bars"></i>
    </button>
    
    <div id="as-charts-chart-list">

    </div>

  </div>

  <div id="as-charts-main">
    <div class="as-charts-grid-cell"></div>
    <div class="as-charts-grid-cell"></div>
    <div class="as-charts-grid-cell"></div>
    <div class="as-charts-grid-cell"></div>
    <div class="as-charts-grid-cell"></div>
    <div class="as-charts-grid-cell"></div>
  </div>

  </div>

<script>
    $(document).ready(function () {
      let chartManager = new CHARTMANAGER()
      chartManager.run()
    })
</script>