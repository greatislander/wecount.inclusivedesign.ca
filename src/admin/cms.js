/* eslint-disable react/display-name */
/* global CMS, createClass, nunjucks, PropTypes, React */

import {UuidControl, UuidPreview} from "netlify-cms-widget-uuid-v4";
import dateFilter from "../filters/date";
import htmlSymbolFilter from "../filters/html-symbol";
import markdownFilter from "../filters/markdown";
import randomizeFilter from "../filters/randomize";
import slugFilter from "../filters/slug";
import w3DateFilter from "../filters/w3-date";
import expanderShortcode from "../shortcodes/expander.js";
import imageAndTextShortcode from "../shortcodes/image-and-text.js";
import getId from "../utils/extract-youtube-id.js";

const env = nunjucks.configure();

env.addFilter("dateFilter", dateFilter);
env.addFilter("htmlSymbolFilter", htmlSymbolFilter);
env.addFilter("markdownFilter", markdownFilter);
env.addFilter("randomizeFilter", randomizeFilter);
env.addFilter("slug", slugFilter);
env.addFilter("w3DateFilter", w3DateFilter);

const NunjucksPreview = ({ entry, path, context }) => {
	const data = context(entry.get("data").toJS(), entry);
	const html = env.render(path, data);
	return <div dangerouslySetInnerHTML={{ __html: html }} />;
};

NunjucksPreview.propTypes = {
	entry: PropTypes.object.isRequired,
	path: PropTypes.string.isRequired,
	context: PropTypes.func.isRequired
};

CMS.registerPreviewStyle("/css/main.css");

const Page = createClass({
	render: function() {
		return <main>
			<article className="page">
				<h1>{this.props.entry.getIn(["data", "title"])}</h1>
				<>
					{this.props.widgetFor("body")}
				</>
			</article>
		</main>;
	}
});

Page.propTypes = {
	entry: PropTypes.object.isRequired
};

const News = ({ entry }) => {
	return <NunjucksPreview
		entry={entry}
		path="layouts/news.njk"
		context={({title, date, link, excerpt}) => ({
			title: "News",
			previewMode: true,
			pagination: {
				items: [
					{
						data: {
							title,
							date: Date.parse(date),
							link,
							excerpt
						}
					}
				]
			}
		})}
	/>;
};

News.propTypes = {
	entry: PropTypes.object.isRequired
};

const Views = createClass({
	render: function() {
		const tagItems = this.props.entry.getIn(["data", "tags"]);

		const tags = [];

		for (const [index, value] of tagItems.entries()) {
			tags.push(<a key={index} href={"/tags/" + slugFilter(value)}>{value}</a>);
		}

		return <main>
			<article className="post-article">
				<h1>{this.props.entry.getIn(["data", "title"])}</h1>
				<div className="author">{this.props.entry.getIn(["data", "author"])}</div>
				<time>{dateFilter(this.props.entry.getIn(["data", "date"]))}</time>
				<div className="api-content">
					{this.props.widgetFor("body")}
				</div>
				<section className="tags-info">
					<h2 className="h3">Tags</h2>
					<div className="tags">{tags}</div>
				</section>
			</article>
		</main>;
	}
});

Views.propTypes = {
	entry: PropTypes.object.isRequired
};

const Initative = ({ entry, getAsset }) => {
	return <NunjucksPreview
		entry={entry}
		path="layouts/initiative.njk"
		context={({title, id, eventDate, shortDescription, previewImageAltText, coverImageAltText, body }, entry) => ({
			previewMode: true,
			title,
			id,
			eventDate,
			shortDescription,
			previewImageUrl: getAsset(entry.getIn(["data", "previewImageUrl"])),
			previewImageAltText,
			coverImageUrl: getAsset(entry.getIn(["data", "coverImageUrl"])),
			coverImageAltText,
			content: markdownFilter(body || ""),
		})}
	/>;
};

Initative.propTypes = {
	entry: PropTypes.object.isRequired,
	getAsset: PropTypes.object.isRequired
};

CMS.registerPreviewTemplate("pages", Page);
CMS.registerPreviewTemplate("news", News);
CMS.registerPreviewTemplate("views", Views);
CMS.registerPreviewTemplate("initiatives", Initative);

CMS.registerWidget("uuid", UuidControl, UuidPreview);
CMS.registerEditorComponent({
	id: "expander",
	label: "Expander",
	fields: [
		{
			name: "image",
			label: "Image",
			widget: "image",
			required: true
		},
		{
			name: "alt",
			label: "Alternative Text",
			widget: "string"
		},
		{
			name: "title",
			label: "Title",
			widget: "string",
			required: true
		},
		{
			name: "subtitle",
			label: "Subtitle",
			widget: "string"
		},
		{
			name: "content",
			label: "Content",
			widget: "markdown",
			required: true
		}
	],
	pattern: /^{% expander "([\s\S]*?)", "([\s\S]*?)", "([\s\S]*?)", "([\s\S]*?)" %}([\s\S]*?){% endexpander %}/,
	fromBlock: function (match) {
		return {
			image: match[1],
			alt: match[2],
			title: match[3],
			subtitle: match[4],
			content: match[5]
		};
	},
	toBlock: function (obj) {
		return `{% expander "${obj.image}", "${obj.alt}", "${obj.title}", "${obj.subtitle}" %}\n${obj.content}\n{% endexpander %}`;
	},
	toPreview: function (obj, getAsset, fields) {
		const {content, image, alt, title, subtitle} = obj;
		const imageField = fields.find(f => f.get("widget") === "image");
		const src = getAsset(image, imageField);
		return expanderShortcode(content, src, alt, title, subtitle)
		// Show expanded state for preview purposes.
			.replace(" hidden", "")
			.replace("aria-expanded=\"false\"", "aria-expanded=\"true\"");
	}
});

CMS.registerEditorComponent({
	id: "image-and-text",
	label: "Image and Text",
	fields: [
		{
			name: "image",
			label: "Image",
			widget: "image",
			required: true
		},
		{
			name: "alt",
			label: "Alternative Text",
			widget: "string"
		},
		{
			name: "imagePosition",
			label: "Image Position",
			widget: "select",
			options: [{value:"left", label: "Left"}, {value:"right", label: "Right"}]
		},
		{
			name: "verticalAlignment",
			label: "Vertical Alignment",
			widget: "select",
			options: [{value:"top", label: "Top"}, {value:"center", label: "Center"}, {value:"bottom", label: "Bottom"}]
		},
		{
			name: "content",
			label: "Content",
			widget: "markdown",
			required: true
		}
	],
	pattern: /^{% imageAndText "([\s\S]*?)", "([\s\S]*?)", "([\s\S]*?)", "([\s\S]*?)" %}([\s\S]*?){% endimageAndText %}/,
	fromBlock: function (match) {
		return {
			image: match[1],
			alt: match[2],
			imagePosition: match[3],
			verticalAlignment: match[4],
			content: match[5]
		};
	},
	toBlock: function (obj) {
		return `{% imageAndText "${obj.image}", "${obj.alt}", "${obj.imagePosition}", "${obj.verticalAlignment}" %}\n${obj.content}\n{% endimageAndText %}`;
	},
	toPreview: function (obj, getAsset, fields) {
		const {content, image, alt, imagePosition, verticalAlignment} = obj;
		const imageField = fields.find(f => f.get("widget") === "image");
		const src = getAsset(image, imageField);
		return imageAndTextShortcode(content, src, alt, imagePosition, verticalAlignment);
	}
});

CMS.registerEditorComponent({
	id: "youtube",
	label: "YouTube Embed",
	fields: [
		{name: "url", label: "YouTube Video URL", widget: "string"},
	],
	pattern: /^{% youtube "(\S+)" %}$/,
	fromBlock: function(match) {
		return {
			url: match[1]
		};
	},
	toBlock: function(obj) {
		return `{% youtube "${obj.url}" %}`;
	},
	toPreview: function(obj) {
		return (
			`<figure class="embed--youtube"><iframe class="youtube-player video video--youtube" src="https://youtube.com/embed/${getId(obj.url)}" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></figure>`
		);
	}
});

CMS.registerEditorComponent({
	label: "File",
	id: "file",
	fromBlock: match =>
		match && {
			file: match[2],
			text: match[1],
		},
	toBlock: ({ text, file }) =>
		`[${text || ""}](${file || ""})`,
	toPreview: (obj) => {
		return <a href={obj.file || ""}>{obj.text}</a>;
	},
	pattern: /^\[(.*)\]\((.*?)\)$/,
	fields: [
		{
			label: "File",
			name: "file",
			widget: "file",
			media_library: {
				allow_multiple: false,
			},
		},
		{
			label: "Link Text",
			name: "text",
		}
	],
});

