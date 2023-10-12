<template>
  <div>
    <div style="margin-bottom: 0" class="buttons has-addons">
      <button
        style="margin-bottom: 0"
        class="button is-light"
        v-on:click="goBack"
      >
        <span class="icon is-small">
          <i class="fas fa-arrow-circle-left"></i>
        </span>
        <span>Go Back</span>
      </button>
      <button
        style="margin-bottom: 0"
        class="button is-light"
        v-on:click="showAnnotated = !showAnnotated"
      >
        <span v-if="!showAnnotated" class="icon is-small">
          <i class="far fa-eye-slash"></i>
        </span>
        <span v-else class="icon is-small">
          <i class="far fa-eye"></i>
        </span>
        <span>{{ showAnnotated ? "Hide" : "Show" }} Annotated Videos</span>
      </button>
      <button
        style="margin-bottom: 0"
        class="button is-light"
        v-on:click="saveAnnotations(folder)"
        :disabled="!dirty"
      >
        <span class="icon is-small">
          <i class="far fa-save"></i>
        </span>
        <span>{{ dirty ? "Save" : "Saved" }}</span>
      </button>

      <button class="button is-white is-active" style="margin-bottom: 0">
        <span class="icon is-small">
          <i class="far fa-clock"></i>
        </span>
        Speed
        <vue-slider
          style="width: 100px; margin-bottom: 0; margin-left: 5px"
          v-model="rate"
          :min="0.3"
          :max="1.5"
          :interval="0.01"
          :contained="true"
          :drag-on-click="true"
          :tooltip-placement="'bottom'"
          :tooltip-formatter="formatter"
        />
      </button>

      <button
        style="margin-bottom: 0; pointer-events: none"
        class="button is-white is-active"
      >
        <span class="icon is-small">
          <i class="fas fa-tasks"></i>
        </span>
        <span
          >Progress: {{ annotatedVideos.length }} / {{ videos.length }}</span
        >
      </button>
    </div>

    <div class="columns is-mobile is-gapless">
      <div class="column is-2" style="max-width: 180px">
        <video-list
          v-bind:selected="selected"
          v-bind:showAnnotated="showAnnotated"
          v-on:select="selected = $event"
        />
      </div>

      <div class="column" v-show="selected">
        <annotator
          v-bind:video="selected"
          v-bind:annotation="annotations[basename(selected)]"
          v-bind:caption="captions[basename(selected)]"
          v-on:annotate="annotate"
          v-bind:rate="rate"
        />
      </div>
    </div>
  </div>
</template>

<script>
import path from "path";
import VideoList from "./VideoList";
import Annotator from "./Annotator";
import VueSlider from "vue-slider-component";
import { debounce } from "../../utils";
import { mapMutations, mapGetters, mapState, mapActions } from "vuex";
import { ipcRenderer } from "electron";
import "vue-slider-component/theme/default.css";

export default {
  name: "AnnotationPanel",
  components: {
    "video-list": VideoList,
    annotator: Annotator,
    VueSlider,
  },
  data() {
    return {
      selected: null,
      showAnnotated: true,
      rate: 1.0,
      formatter: "{value}x",
    };
  },
  created() {
    let vm = this;
    vm.selected = vm.videos[0];
    ipcRenderer.on("jump-to-previous-video", () => {
      const index = vm.videos.findIndex((video) => video === vm.selected);
      vm.selected = vm.videos[Math.max(index - 1, 0)];
    });
    ipcRenderer.on("jump-to-next-video", () => {
      const index = vm.videos.findIndex((video) => video === vm.selected);
      vm.selected = vm.videos[Math.min(index + 1, this.videos.length - 1)];
    });
  },
  destroyed() {
    ipcRenderer.removeAllListeners("jump-to-previous-video");
    ipcRenderer.removeAllListeners("jump-to-next-video");
  },
  methods: {
    ...mapMutations(["deactivateFolder"]),
    ...mapMutations({ setAnnotation: "annotations/set" }),
    ...mapActions({
      saveAnnotations: "annotations/save",
    }),

    goBack() {
      this.saveAnnotations(this.folder).then(() => {
        this.deactivateFolder();
      });
    },

    saveAnnotationsDebounced: debounce((vm) => {
      vm.saveAnnotations(vm.folder);
    }, 3000),

    annotate(value) {
      this.setAnnotation({ video: this.selected, value });
      this.saveAnnotationsDebounced(this);
    },

    basename: (s) => path.basename(s),
  },
  computed: {
    ...mapState({ dirty: (state) => state.annotations.dirty }),
    ...mapGetters({
      videos: "activeVideos",
      annotations: "activeAnnotations",
      captions: "activeCaptions",
      annotatedVideos: "activeAnnotatedVideos",
    }),
    ...mapState({
      folder: "activeFolder",
    }),
    ...mapGetters(["windowHeight", "windowWidth"]),
  },
};
</script>

