<template>
  <div :style="{ 'max-height': windowHeight - 40 + 'px' }">
    <div class="tile is-ancestor is-vertical">
      <div class="tile is-parent">
        <video
          id="player"
          autoplay
          controls
          :src="video | url"
          v-playback-rate="rate"
        />
      </div>

      <div class="tile is-parent">
        <div class="notification" style="width: 100%; font-size: small">
          <div>
            <span class="icon is-medium"> <i class="fas fa-film"></i>: </span>
            <span>{{ video }}</span>
          </div>
          <div>
            <span class="icon is-medium">
              <i class="far fa-closed-captioning"></i>:
            </span>
            <span>{{ caption }}</span> &nbsp;
            <button
              v-on:click="annotationText += caption"
              :disabled="caption === ''"
            >
              Insert
            </button>
          </div>
          <div>
            <span class="icon is-medium"> <i class="fas fa-edit"></i>: </span>
            <span>{{ annotationText }}</span>
          </div>
        </div>
      </div>

      <div class="tile is-parent">
        <textarea
          class="textarea"
          ref="textarea"
          v-model.trim="annotationText"
          rows="3"
        />
      </div>
    </div>
  </div>
</template>

<style>
video#player {
  width: 100%;
  max-height: 400px;
}

video#player:focus {
  outline: 0;
}
</style>

<script>
import { mapGetters } from "vuex";
export default {
  name: "Annotator",
  props: {
    video: String,
    caption: String,
    annotation: String,
    rate: Number,
  },
  directives: {
    playbackRate(el, binding) {
      el.playbackRate = binding.value;
    },
  },
  computed: {
    ...mapGetters(["windowHeight"]),
    annotationText: {
      get() {
        return this.annotation;
      },
      set(value) {
        this.$emit("annotate", value);
      },
    },
  },
  watch: {
    video() {
      this.$refs.textarea.focus();
    },
  },
  filters: {
    url: (s) => "local-resource://" + s,
  },
};
</script>
