<template>
  <div id="app">
    <annotation-panel v-if="activeFolder" />
    <overview-panel
      v-else-if="panel == 'overview'"
      v-on:switch-panel="panel = $event"
    />
    <lexicon-panel
      v-else-if="panel == 'lexicon'"
      v-on:go-back="panel = 'overview'"
    />
  </div>
</template>

<script>
import Vue from "vue";
import Vuex from "vuex";
import Toasted from "vue-toasted";
import store from "./store";
import OverviewPanel from "./components/overview/OverviewPanel";
import LexiconPanel from "./components/statistics/LexiconPanel";
import AnnotationPanel from "./components/annotation/AnnotationPanel";
import { debounce } from "./utils";

Vue.use(Toasted, {
  iconPack: "fontawesome",
});

export default {
  name: "App",
  store: store,
  components: {
    "overview-panel": OverviewPanel,
    "annotation-panel": AnnotationPanel,
    "lexicon-panel": LexiconPanel,
  },
  data: () => {
    return { panel: "overview" };
  },
  created() {
    this.updateWindowSize();
    window.addEventListener("resize", debounce(this.updateWindowSize, 50));
  },
  methods: {
    updateWindowSize() {
      this.setWindowSize({
        height: window.innerHeight,
        width: window.innerWidth,
      });
    },
    ...Vuex.mapMutations(["setWindowSize"]),
  },
  computed: {
    ...Vuex.mapState(["activeFolder"]),
  },
};
</script>

<style lang="scss">
$fa-font-path: "~@fortawesome/fontawesome-free/webfonts/";
@import "~@fortawesome/fontawesome-free/scss/fontawesome.scss";
@import "~@fortawesome/fontawesome-free/scss/solid.scss";
@import "~@fortawesome/fontawesome-free/scss/brands.scss";
@import "~@fortawesome/fontawesome-free/scss/regular.scss";
@import "~bulma/bulma.sass";
</style>

